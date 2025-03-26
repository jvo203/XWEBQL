program test
   use iso_c_binding
   use omp_lib
   implicit none

   integer(kind=c_size_t), parameter :: NOSAMPLES = 100
   real(kind=c_float), dimension(NOSAMPLES) :: data

   ! initialize x with random data
   call random_number(data)
   data(4:8) = -1.0

   call bayesian_binning(data, NOSAMPLES)
contains
   subroutine bayesian_binning(x, n) bind(c)
      integer(kind=c_size_t), intent(in) :: n
      real(kind=c_float), intent(inout) :: x(n)

      real(kind=c_float), dimension(:), allocatable :: sorted, weights

      call partition(x, sorted, weights)
      print *, "sorted: ", sorted
      print *, "weights: ", weights
   end subroutine bayesian_binning

   ! partition the data (sort and remove duplicates)
   subroutine partition(x, unique, weights)
      real(kind=c_float), intent(inout) :: x(:)
      real(kind=c_float), dimension(:), allocatable, intent(out) :: unique, weights

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
   end subroutine partition

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
