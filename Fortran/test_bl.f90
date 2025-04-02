program test
   use iso_c_binding
   use omp_lib
   implicit none

   type, bind(c) :: BayesHistogram
      type(c_ptr) :: edges, centers, widths, heights
      integer(kind=c_int) :: n
   end type BayesHistogram

   type(c_ptr) :: histogram

   integer(kind=c_int64_t), parameter :: NOSAMPLES = 200000
   integer, parameter :: WORKSIZE = 1024 ! up to 1K per thread
   real(kind=c_float), dimension(NOSAMPLES) :: data
   integer(kind=c_int64_t) :: ios, M

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

   print *, 'M:', M
   ! print the last 10 elements
   print *, 'data:', data(M-10:M)

   !call fast_bayesian_binning(data, NOSAMPLES)
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

      blocks => build_blocks(unique, change_points, weights)
      fast_bayesian_binning = c_loc(blocks)
   end function fast_bayesian_binning

   type(c_ptr) function parallel_bayesian_binning(x, n, resolution) bind(C)
      implicit none

      integer(kind=c_int64_t), intent(in) :: n
      real(kind=c_float), intent(inout) :: x(n)
      integer(kind=c_int), intent(in), optional :: resolution

      real(kind=c_float), dimension(:), allocatable :: unique, weights, change_points
      real(kind=c_float) :: extent, dt
      integer :: i, L

      type(BayesHistogram), pointer :: blocks

      if(n .eq. 0) then
         allocate(blocks)
         blocks = BayesHistogram(c_null_ptr, c_null_ptr, c_null_ptr, c_null_ptr, 0)
         parallel_bayesian_binning = c_loc(blocks)
         return
      end if

      ! sort the data
      call quicksort(x, 1, size(x))

      allocate(unique(size(x)))
      allocate(weights(size(x)))

      L = 1
      unique(1) = x(1)
      weights(1) = 1

      do i = 2, size(x)
         if(x(i) .eq. x(i-1)) then
            weights(L) = weights(L) + 1
         else
            L = L + 1
            unique(L) = x(i)
            weights(L) = 1
         end if
      end do

      ! truncate the outputs
      unique = unique(1:L)
      weights = weights(1:L)

      extent = unique(L) - unique(1)

      if(present(resolution)) then
         dt = abs(extent / resolution)
      else
         dt = 0.0 ! by default the resolution is infinite
      end if

      print *, '[FORTRAN] no. points:', n, 'unique samples:', L, 'dt:', dt

      print *, '[FORTRAN] omp max threads:', omp_get_max_threads()
      change_points = bayesian_binning(unique, weights)

      ! a placeholder for the time being
      allocate(blocks)
      blocks = BayesHistogram(c_null_ptr, c_null_ptr, c_null_ptr, c_null_ptr, 0)
      parallel_bayesian_binning = c_loc(blocks)
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

      allocate(blocks)
      blocks = BayesHistogram(c_loc(edges), c_loc(centers), c_loc(widths), c_loc(heights), len-1)
   end function build_blocks

   subroutine delete_blocks(ptr) bind(C)
      implicit none

      type(c_ptr), intent(in), value :: ptr
      type(BayesHistogram), pointer:: blocks

      real(kind=c_float), dimension(:), pointer :: edges, centers, heights, widths

! convert a C pointer to a Fortran pointer
      if (.not. c_associated(ptr)) return
      call c_f_pointer(ptr, blocks)

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

   recursive function bayesian_binning(unique, weights) result(edges)
      real(kind=c_float), dimension(:), intent(in) :: unique, weights
      real(kind=c_float), dimension(:), allocatable :: edges, thread_edges

      integer :: len, mid

      len = size(unique)

      ! check the length of the input
      if(len .gt. WORKSIZE) then
         ! split the data into two overlapping halves, launch two OpenMP tasks and merge the results
         mid = len / 2
         print *, '[FORTRAN] splitting the data into two halves@', mid

         !$omp parallel shared(edges, unique, weights) private(thread_edges)
         !$omp single
         !$omp task
         thread_edges = bayesian_binning(unique(1:mid), weights(1:mid))

         !$omp critical
         if(.not. allocated(edges)) then
            edges = thread_edges(2:size(thread_edges)-1)
         else
            edges = (/edges, thread_edges(2:size(thread_edges-1))/)
         end if
         !$omp end critical
         !$omp end task

         !$omp task
         ! there is a deliberate overlap between the two halves
         edges = bayesian_binning(unique(mid:len), weights(mid:len))

         !$omp critical
         if(.not. allocated(edges)) then
            edges = thread_edges(2:size(thread_edges)-1)
         else
            edges = (/edges, thread_edges(2:size(thread_edges-1))/)
         end if
         !$omp end critical
         !$omp end task

         !$omp end single
         !$omp end parallel
         print *, '[FORTRAN] merging the results@', mid
      else
         ! base case: the input is small enough
         print *, '[FORTRAN] base case:', len

         ! allocate the edges
         allocate(edges(len+1), source=0.0)
         edges(1) = unique(1)
         edges(len+1) = unique(len)

         ! find the change points
         edges(2:len) = 0.5 * (unique(1:len-1) + unique(2:len))
      end if

   end function bayesian_binning

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
end program test
