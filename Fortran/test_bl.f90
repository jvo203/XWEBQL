program test
   use iso_c_binding
   use omp_lib
   use mod_sort
   use m_mrgrnk
   implicit none

   type, bind(c) :: BayesHistogram
      type(c_ptr) :: edges, centers, widths, heights
      integer(kind=c_int) :: n
   end type BayesHistogram

   type(c_ptr) :: histogram

   integer(kind=c_int64_t), parameter :: NOSAMPLES = 200000
   integer, parameter :: WORKSIZE = 1024 ! up to 1K per thread
   real(kind=c_float), dimension(NOSAMPLES) :: data
   integer(kind=c_int64_t) :: ios, M, IDX

   ! initialize x with random data
   !call random_number(data)
   !data(4:8) = -1.0

   ! read-in data from file energy.txt
   open(10, file='../Julia/energy.txt', status='old')

   M = 0
   ! read until the end of file, no more than NOSAMPLES
   do
      read(10, *, iostat=ios) data(M+1)
      if (ios /= 0) exit
      M = M + 1
      if (M >= NOSAMPLES) exit
   end do

   close(10) ! close the file
   print *, 'M:', M

   ! set the data to 1 .. M
   !data = [(real(IDX, kind=c_float), IDX=1,M)]

   !histogram = fast_bayesian_binning(data, NOSAMPLES)
   histogram = parallel_bayesian_binning(data, M, 512)

   ! release the memory
   call delete_blocks(histogram)
contains
   type(c_ptr) function fast_bayesian_binning(x, n, resolution) bind(C)
      implicit none

      integer(kind=c_int64_t), intent(in) :: n
      real(kind=c_float), intent(inout) :: x(n)
      integer(kind=c_int), intent(in), optional :: resolution

      real(kind=c_float), dimension(:), allocatable :: unique, weights, edges, change_points
      real(kind=c_float), dimension(:), pointer :: wh_in_edge
      real(kind=c_float), dimension(:), allocatable :: best
      integer, dimension(:), allocatable :: best_idx
      real(kind=c_float) :: extent, dt, width, fit_max, cnt_in_range, fitness
      integer :: i, Q, L, i_max

      type(BayesHistogram), pointer :: blocks

      if(n .eq. 0) then
         allocate(blocks)
         blocks = BayesHistogram(c_null_ptr, c_null_ptr, c_null_ptr, c_null_ptr, 0)
         fast_bayesian_binning = c_loc(blocks)
         return
      end if

      L = partition(x, unique, weights, edges)
      print *, 'unique:', unique(1), unique(L)
      extent = unique(L) - unique(1)

      if(present(resolution)) then
         dt = abs(extent / resolution)
      else
         dt = 0.0 ! by default the resolution is infinite
      end if

      print *, '[FORTRAN] no. points:', n, 'unique samples:', L, 'dt:', dt

      wh_in_edge => count_between_edges(unique, edges, weights, 1)
      call cumsum(wh_in_edge)

      allocate(best(L), best_idx(L))

      do Q = 1, L
         fit_max = -1.0e38 ! -Inf
         i_max = 0

         do i = 1,Q
            cnt_in_range = wh_in_edge(Q+1) - wh_in_edge(i)
            width = edges(Q+1) - edges(i)
            if (width .le. dt) exit

            fitness = cnt_in_range * log(cnt_in_range / width) - log(wh_in_edge(size(wh_in_edge)))
            if (i.gt. 1) fitness = fitness + best(i-1)

            if (fitness .gt. fit_max) then
               fit_max = fitness
               i_max = i
            end if
         end do

         best(Q) = fit_max
         best_idx(Q) = i_max
      end do

      deallocate(wh_in_edge)

      ! pre-allocate change_points
      allocate(change_points(L+1))
      i = 1

      ! iteratively peel off the last block (this works fine)
      L = L + 1
      do while (L .gt. 0)
         change_points(i) = edges(L)
         i = i + 1

         if (L .eq. 1) exit
         L = best_idx(L-1)
      end do

      ! in-place reverse the change_points between 1 and i-1
      change_points = change_points( i-1:1:-1 )
      !print *, '[FORTRAN] change_points:', change_points, 'length:', size(change_points)

      blocks => build_blocks(unique, change_points, weights)
      fast_bayesian_binning = c_loc(blocks)
   end function fast_bayesian_binning

   type(c_ptr) function parallel_bayesian_binning(x, n, resolution) bind(C)
      implicit none

      integer(kind=c_int64_t), intent(in) :: n
      real(kind=c_float), intent(inout) :: x(n)
      integer(kind=c_int), intent(in), optional :: resolution

      real(kind=c_float), dimension(:), allocatable :: unique, weights, change_points
      integer, dimension(:), allocatable :: order
      real(kind=c_float) :: extent, dt
      integer :: i, L

      type(BayesHistogram), pointer :: blocks

      ! timing
      real(kind=8) :: t1, t2

      if(n .eq. 0) then
         allocate(blocks)
         blocks = BayesHistogram(c_null_ptr, c_null_ptr, c_null_ptr, c_null_ptr, 0)
         parallel_bayesian_binning = c_loc(blocks)
         return
      end if

      ! start the timer
      t1 = omp_get_wtime()

      allocate(order(size(x)))
      call parallel_sort(x, order)
      print *, '[FORTRAN] parallel sort done', x(order(1)), x(order(size(x)))

      ! sort the data
      !call quicksort(x, 1, size(x))

      !$OMP PARALLEL
      !$OMP SINGLE
      !call quicksort_parallel(x, 1, size(x))
      call quicksort_omp(x, 1, size(x))
      !$OMP END SINGLE
      !$OMP END PARALLEL

      print *, '[FORTRAN] quicksort done', x(1), x(size(x))

      ! set the order array to 1, 2, ..., size(x)
      order = [(i, i=1,size(x))]

      ! end the timer
      t2 = omp_get_wtime()

      print *, '[FORTRAN] sorting time (s):', t2 - t1

      allocate(unique(size(x)))
      allocate(weights(size(x)))

      L = 1
      unique(1) = x(order(1))
      weights(1) = 1

      do i = 2, size(x)
         if(x(order(i)) .eq. x(order(i-1))) then
            weights(L) = weights(L) + 1
         else
            L = L + 1
            unique(L) = x(order(i))
            weights(L) = 1
         end if
      end do

      deallocate(order)

      ! truncate the outputs
      unique = unique(1:L)
      weights = weights(1:L)

      ! print the first and last unique samples
      !print *, 'unique:', unique(1), unique(L)

      extent = unique(L) - unique(1)

      if(present(resolution)) then
         dt = abs(extent / resolution)
      else
         dt = 0.0 ! by default the resolution is infinite
      end if

      print *, '[FORTRAN] no. points:', n, 'unique samples:', L, 'dt:', dt

      print *, '[FORTRAN] omp max threads:', omp_get_max_threads()
      change_points = divide_bayesian_binning(unique, weights, dt)

      ! in-place sort the change_points
      call quicksort(change_points, 1, size(change_points))

      ! remove duplicates
      change_points = deduplicate(change_points)

      ! prepend the first element and append the last element
      !change_points = [unique(1), change_points, unique(L)]
      !print *, '[FORTRAN] change_points:', change_points, 'length:', size(change_points)

      ! a placeholder for the time being
      allocate(blocks)
      blocks => build_blocks(unique, change_points, weights)
      parallel_bayesian_binning = c_loc(blocks)

      !deallocate(unique)
      !deallocate(weights)
      !deallocate(change_points)

      !allocate(blocks)
      !blocks = BayesHistogram(c_null_ptr, c_null_ptr, c_null_ptr, c_null_ptr, 0)
      !parallel_bayesian_binning = c_loc(blocks)
   end function parallel_bayesian_binning

   function build_blocks(x, change_points, weights) result(blocks)
      real(kind=c_float), dimension(:), intent(in) :: x, change_points, weights
      type(BayesHistogram), pointer :: blocks

      real(kind=c_float), dimension(:), pointer :: edges, centers, heights, widths, counts
      real(kind=c_float) :: total
      integer :: len

      len = size(change_points)
      allocate(edges(len), source=change_points)
      allocate(centers(len-1), heights(len-1), widths(len-1))

      centers = 0.5 * (change_points(1:len-1) + change_points(2:len))
      widths = change_points(2:len) - change_points(1:len-1)

      counts => count_between_edges(x, change_points, weights, 0)
      total = sum(counts)
      heights = counts / (total * widths)
      deallocate(counts)

      allocate(blocks)
      blocks = BayesHistogram(c_loc(edges), c_loc(centers), c_loc(widths), c_loc(heights), len-1)
   end function build_blocks

   subroutine delete_blocks(ptr) bind(C)
      implicit none

      type(c_ptr), intent(in), value :: ptr
      type(BayesHistogram), pointer:: blocks

      real(kind=c_float), dimension(:), pointer :: edges, centers, heights, widths

      print *, '[FORTRAN] deleting blocks ...'

! convert a C pointer to a Fortran pointer
      if (.not. c_associated(ptr)) return
      call c_f_pointer(ptr, blocks)

      print *, '[FORTRAN] number of blocks:', blocks%n

      if (blocks%n .le. 0) then
         deallocate(blocks)
         return
      end if

      call c_f_pointer(blocks%edges, edges, [blocks%n+1])
      call c_f_pointer(blocks%centers, centers, [blocks%n])
      call c_f_pointer(blocks%widths, widths, [blocks%n])
      call c_f_pointer(blocks%heights, heights, [blocks%n])

      deallocate(edges)
      deallocate(centers)
      deallocate(widths)
      deallocate(heights)

      deallocate(blocks)
   end subroutine delete_blocks

   ! partition the data (sort and remove duplicates)
   function partition(x, unique, weights, edges) result(tail)
      real(kind=c_float), intent(inout) :: x(:)
      real(kind=c_float), dimension(:), allocatable, intent(out) :: unique, weights, edges

      integer:: i, tail

      ! sort the data
      call quicksort(x, 1, size(x))

      allocate(unique(size(x)))
      allocate(weights(size(x)))

      tail = 1
      unique(1) = x(1)
      weights(1) = 1

      do i = 2, size(x)
         if(x(i) .eq. x(i-1)) then
            weights(tail) = weights(tail) + 1
         else
            tail = tail + 1
            unique(tail) = x(i)
            weights(tail) = 1
         end if
      end do

      ! truncate the outputs
      unique = unique(1:tail)
      weights = weights(1:tail)

      ! auto-allocate and fill-in the edges
      edges = (/unique(1), 0.5 * (unique(1:tail-1) + unique(2:tail)), unique(tail)/)
   end function partition

   function deduplicate(x) result (unique)
      real(kind=c_float), dimension(:), intent(in) :: x
      real(kind=c_float), dimension(:), allocatable :: unique
      integer :: i, tail

      allocate(unique(size(x)))

      tail = 1
      unique(1) = x(1)

      do i = 2, size(x)
         if(x(i) .eq. x(i-1)) then
            ! do nothing
         else
            tail = tail + 1
            unique(tail) = x(i)
         end if
      end do

      ! truncate the outputs
      unique = unique(1:tail)
   end function deduplicate

   recursive function divide_bayesian_binning(unique, weights, dt) result(change_points)
      real(kind=c_float), dimension(:), intent(in) :: unique
      real(kind=c_float), dimension(:), intent(inout) :: weights
      real(kind=c_float), intent(in) :: dt
      real(kind=c_float), dimension(:), allocatable :: change_points, thread_change_points

      integer :: L, mid

      L = size(unique)

      ! check the length of the input
      if(L .gt. WORKSIZE) then
         ! split the data into two overlapping halves, launch two OpenMP tasks and merge the results
         mid = L / 2
         !print *, '[FORTRAN] splitting the data into two halves@', mid

         ! the middle point will be counted twice, halve its weight
         weights(mid) = weights(mid) / 2

         !$omp parallel shared(change_points, unique, weights) private(thread_change_points)
         !$omp single
         !$omp task
         thread_change_points = divide_bayesian_binning(unique(1:mid), weights(1:mid), dt)

         !$omp critical
         if(.not. allocated(change_points)) then
            change_points = thread_change_points
         else
            change_points = (/change_points, thread_change_points/)
         end if
         !$omp end critical
         !$omp end task

         !$omp task
         ! there is a deliberate overlap between the two halves
         thread_change_points = divide_bayesian_binning(unique(mid:L), weights(mid:L), dt)

         !$omp critical
         if(.not. allocated(change_points)) then
            change_points = thread_change_points
         else
            change_points = (/change_points, thread_change_points/)
         end if
         !$omp end critical
         !$omp end task

         !$omp end single
         !$omp end parallel

         !print *, '[FORTRAN] merging the results@', mid
         ! restore the weight of the middle point
         weights(mid) = weights(mid) * 2
      else
         ! base case: the input is small enough
         !print *, '[FORTRAN] base case:', L

         change_points = conquer_bayesian_binning(unique, weights, dt)
      end if

   end function divide_bayesian_binning

   function conquer_bayesian_binning(unique, weights, dt) result(change_points)
      real(kind=c_float), dimension(:), intent(in) :: unique, weights
      real(kind=c_float), intent(in) :: dt

      real(kind=c_float), dimension(:), allocatable :: edges, change_points
      real(kind=c_float), dimension(:), pointer :: wh_in_edge
      real(kind=c_float), dimension(:), allocatable :: best
      integer, dimension(:), allocatable :: best_idx
      real(kind=c_float) :: width, fit_max, cnt_in_range, fitness
      integer :: i, Q, L, i_max

      L = size(unique)

      ! auto-allocate and fill-in the edges
      edges = (/unique(1), 0.5 * (unique(1:L-1) + unique(2:L)), unique(L)/)

      wh_in_edge => count_between_edges(unique, edges, weights, 1)
      call cumsum(wh_in_edge)

      allocate(best(L), best_idx(L))

      do Q = 1, L
         fit_max = -1.0e38 ! -Inf
         i_max = 0

         do i = 1,Q
            cnt_in_range = wh_in_edge(Q+1) - wh_in_edge(i)
            width = edges(Q+1) - edges(i)
            if (width .le. dt) exit

            fitness = cnt_in_range * log(cnt_in_range / width) - log(wh_in_edge(size(wh_in_edge)))
            if (i.gt. 1) fitness = fitness + best(i-1)

            if (fitness .gt. fit_max) then
               fit_max = fitness
               i_max = i
            end if
         end do

         best(Q) = fit_max
         best_idx(Q) = i_max
      end do

      deallocate(wh_in_edge)

      ! pre-allocate change_points
      allocate(change_points(L+1))
      i = 1

      ! iteratively peel off the last block (this works fine)
      L = L + 1
      do while (L .gt. 0)
         change_points(i) = edges(L)
         i = i + 1

         if (L .eq. 1) exit
         L = best_idx(L-1)
      end do

      ! in-place reverse the change_points between 1 and i-1
      change_points = change_points( i-1:1:-1 )

      ! finally skip the first item
      !change_points = change_points(2:L+1)
   end function conquer_bayesian_binning

   function count_between_edges(x, edges, weights, shift) result (counts)
      real(kind=c_float), dimension(:), intent(in) :: x, edges, weights
      integer, intent(in) :: shift

      real(kind=c_float), dimension(:), pointer :: counts
      integer :: i, k, len

      len = size(edges)
      allocate(counts(len-1+shift), source=0.0)

      i = 1

      ! edges are longer by one element
      do k = 1, size(x)
         ! the floating-point comparison is not exact ... watch out!
         do while (.not. (x(k) .ge. edges(i) .and. x(k) .le. edges(i+1)) .and. i .lt. len-1)
            i = i + 1
         end do

         counts(i+shift) = counts(i+shift) + weights(k)
      end do
   end function count_between_edges

   ! in-place cumulative sum
   subroutine cumsum(x)
      real(kind=c_float), intent(inout) :: x(:)
      integer :: i

      do i = 2, size(x)
         x(i) = x(i-1) + x(i)
      end do

   end subroutine cumsum

   recursive subroutine quicksort(a, first, last)
      implicit none
      real(kind=c_float), intent(inout) :: a(*)
      integer, intent(in) :: first, last

      real(kind=c_float) :: x, t
      integer:: i, j

      ! print *, '[FORTRAN] quicksort:', first, last, 'size:', last - first + 1

      x = a( (first+last) / 2 )
      i = first
      j = last
      do
         do while (a(i) < x)
            i=i+1
         end do
         do while (x < a(j))
            j=j-1
         end do
         if (i >= j) exit
         t = a(i);  a(i) = a(j);  a(j) = t
         i=i+1
         j=j-1
      end do
      if (first < i-1) call quicksort(a, first, i-1)
      if (j+1 < last)  call quicksort(a, j+1, last)
   end subroutine quicksort

   recursive subroutine quicksort_omp(a, first, last)
      implicit none
      real(kind=c_float), intent(inout) :: a(*)
      integer, intent(in) :: first, last

      real(kind=c_float) :: x, t
      integer:: i, j

      ! switch to a sequential sort for small arrays
      if (last - first + 1 .le. WORKSIZE) then
         call quicksort(a, first, last)
         return
      end if

      ! print *, '[FORTRAN] quicksort_omp:', first, last, 'size:', last - first + 1

      x = a( (first+last) / 2 )
      i = first
      j = last
      do
         do while (a(i) < x)
            i=i+1
         end do
         do while (x < a(j))
            j=j-1
         end do
         if (i >= j) exit
         t = a(i);  a(i) = a(j);  a(j) = t
         i=i+1
         j=j-1
      end do

      !$OMP TASK SHARED(a, first, last, i, j)
      if (first < i-1) call quicksort_omp(a, first, i-1)
      !$OMP END TASK

      !$OMP TASK SHARED(a, first, last, i, j)
      if (j+1 < last)  call quicksort_omp(a, j+1, last)
      !$OMP END TASK

      !$OMP TASKWAIT ! Wait for the two sub-tasks to complete
   end subroutine quicksort_omp

   RECURSIVE SUBROUTINE quicksort_parallel(arr, low, high)
      IMPLICIT NONE
      REAL(KIND=C_FLOAT), INTENT(INOUT) :: arr(:)
      INTEGER, INTENT(IN)    :: low, high
      INTEGER                :: pivot_idx
      INTEGER, PARAMETER     :: CUTOFF_SIZE = 1024 ! Example cutoff

      IF (low < high) THEN
         IF (high - low + 1 < CUTOFF_SIZE) THEN
            ! Perform sequential sort for small arrays
            CALL quicksort_sequential(arr, low, high)
         ELSE
            print *, '[FORTRAN] quicksort_parallel:', low, high
            CALL quicksort_partition(arr, low, high, pivot_idx)
            print *, '[FORTRAN] pivot index:', pivot_idx, 'pivot value:', arr(pivot_idx)

            !$OMP TASK SHARED(arr, low, pivot_idx)
            CALL quicksort_parallel(arr, low, pivot_idx - 1)
            !$OMP END TASK

            !$OMP TASK SHARED(arr, pivot_idx, high)
            CALL quicksort_parallel(arr, pivot_idx + 1, high)
            !$OMP END TASK

            !$OMP TASKWAIT ! Wait for the two sub-tasks to complete
         END IF
      END IF
   END SUBROUTINE quicksort_parallel

   RECURSIVE SUBROUTINE quicksort_sequential(arr, low, high)
      IMPLICIT NONE
      REAL(KIND=C_FLOAT), INTENT(INOUT) :: arr(:)
      INTEGER, INTENT(IN)    :: low, high
      INTEGER                :: pivot_idx

      IF (low < high) THEN
         CALL quicksort_partition(arr, low, high, pivot_idx)
         CALL quicksort_sequential(arr, low, pivot_idx - 1)
         CALL quicksort_sequential(arr, pivot_idx + 1, high)
      END IF
   END SUBROUTINE quicksort_sequential

   SUBROUTINE quicksort_partition(arr, low, high, pivot_idx)
      IMPLICIT NONE
      REAL(KIND=C_FLOAT), INTENT(INOUT) :: arr(:)
      INTEGER, INTENT(IN)    :: low, high
      INTEGER, INTENT(OUT)   :: pivot_idx
      REAL(KIND=C_FLOAT)     :: pivot, tmp
      INTEGER                :: i, j

      !print *, '[FORTRAN] quicksort_partition:', low, high, 'size:', high - low + 1, 'pivot:', arr((low + high) / 2)
      pivot = arr((low + high) / 2)
      i = low
      j = high

      DO
         DO WHILE (arr(i) < pivot)
            i = i + 1
         END DO
         DO WHILE (pivot < arr(j))
            j = j - 1
         END DO
         IF (i >= j) EXIT
         ! Swap arr(i) and arr(j)
         tmp = arr(i)
         arr(i) = arr(j)
         arr(j) = tmp
         i = i + 1
         j = j - 1
      END DO

      pivot_idx = j
   END SUBROUTINE quicksort_partition

end program test
