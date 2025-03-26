program test
   use iso_c_binding
   use omp_lib
   implicit none

   integer(kind=c_size_t), parameter :: NOSAMPLES = 100
   real(kind=c_float), dimension(NOSAMPLES) :: data

   ! initialize x with random data
   call random_number(data)
   data(4:8) = -1.0

   call fast_bayesian_binning(data, NOSAMPLES)
contains
   subroutine fast_bayesian_binning(x, n, resolution) bind(c)
      integer(kind=c_size_t), intent(in) :: n
      real(kind=c_float), intent(inout) :: x(n)
      integer(kind=c_int), intent(in), optional :: resolution

      real(kind=c_float), dimension(:), allocatable :: unique, weights, edges, wh_in_edge, change_points
      real(kind=c_float), dimension(:), allocatable :: best
      integer(kind=8), dimension(:), allocatable :: best_idx
      real(kind=c_float) :: extent, dt, width, fit_max, cnt_in_range, fitness
      integer(kind=8) :: i, Q, L, i_max

      if(n .eq. 0) return

      L = partition(x, unique, weights, edges)
      print *, 'unique:', unique
      print *, 'weights:', weights
      print *, 'edges:', edges
      print *, 'n:', n, 'unique samples:', L

      wh_in_edge = count_between_edges(unique, edges, weights, 1)
      call cumsum(wh_in_edge)
      print *, 'wh_in_edge:', wh_in_edge

      extent = unique(L) - unique(1)

      if(present(resolution)) then
         dt = abs(extent / resolution)
      else
         dt = 0.0 ! by default the resolution is infinite
      end if

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

      print *, 'best:', best
      print *, 'best_idx:', best_idx

      ! pre-allocate change_points
      allocate(change_points(L+1))
      i = 1

      ! iteratively peel off the last block (this works fine)
      L = L + 1
      do while (L .gt. 0)
         print *, 'block:', edges(L)
         change_points(i) = edges(L)
         i = i + 1

         if (L .eq. 1) exit
         L = best_idx(L-1)
      end do

      print *, 'change_points:', change_points(1:i-1)
   end subroutine fast_bayesian_binning

   ! partition the data (sort and remove duplicates)
   function partition(x, unique, weights, edges) result(tail)
      real(kind=c_float), intent(inout) :: x(:)
      real(kind=c_float), dimension(:), allocatable, intent(out) :: unique, weights, edges

      real(kind=c_float), dimension(:), allocatable :: sorted, w

      integer(kind=8) :: i, tail

      ! sort the data
      call quicksort(x, int(1, kind=8), size(x, kind=8))

      allocate(sorted(size(x)))
      allocate(w(size(x)))

      tail = 1
      sorted(1) = x(1)
      w(1) = 1

      do i = 2, size(x, kind=8)
         if(x(i) .eq. x(i-1)) then
            w(tail) = w(tail) + 1
         else
            tail = tail + 1
            sorted(tail) = x(i)
            w(tail) = 1
         end if
      end do

      ! truncate the outputs
      unique = sorted(1:tail)
      weights = w(1:tail)

      ! auto-allocate and fill-in the edges
      edges = (/unique(1), 0.5 * (unique(1:tail-1) + unique(2:tail)), unique(tail)/)
   end function partition

   function count_between_edges(x, edges, weights, shift) result (counts)
      real(kind=c_float), dimension(:), intent(in) :: x, edges, weights
      integer, intent(in) :: shift

      real(kind=c_float), dimension(:), allocatable :: counts

      integer(kind=8) :: i, k, len

      len = size(edges, kind=8)
      allocate(counts(len-1+shift), source=0.0)

      i = 1

      ! edges are longer by one element
      do k = 1, size(x, kind=8)
         ! the floating-point comparison is not exact ... watch out!
         do while (.not. (x(k) .ge. edges(i) .and. x(k) .le. edges(i+1)))
            i = i + 1
            !if (i .ge. len-1) exit
         end do

         counts(i+shift) = counts(i+shift) + weights(k)
      end do
   end function count_between_edges

   ! in-place cumulative sum
   subroutine cumsum(x)
      real(kind=c_float), intent(inout) :: x(:)
      integer(kind=8) :: i

      do i = 2, size(x, kind=8)
         x(i) = x(i-1) + x(i)
      end do

   end subroutine cumsum

   recursive subroutine quicksort(a, first, last)
      implicit none
      real(kind=c_float), intent(inout) :: a(*)
      integer(kind=8), intent(in) :: first, last

      real(kind=c_float) :: x, t
      integer(kind=8) :: i, j

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
