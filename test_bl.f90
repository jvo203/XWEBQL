program test
   use iso_c_binding
   use omp_lib
   implicit none

   integer(kind=c_size_t), parameter :: NOSAMPLES = 100
   real(kind=c_float), dimension(NOSAMPLES) :: data

   ! initialize x with random data
   call random_number(data)

   call bayesian_binning(data, NOSAMPLES)
contains
   subroutine bayesian_binning(x, n) bind(c)
      integer(kind=c_size_t), intent(in) :: n
      real(kind=c_float), intent(inout) :: x(n)

      real(kind=c_float), dimension(:), allocatable :: sorted, weights

      call partition(x, sorted, weights)
   end subroutine bayesian_binning

   ! partition the data (sort and remove duplicates)
   subroutine partition(x, sorted, weights)
      real(kind=c_float), intent(inout) :: x(:)
      real(kind=c_float), dimension(:), allocatable, intent(out) :: sorted, weights

      integer(kind=8) :: i

      ! sort the data
      call quicksort(x, int(1, kind=8), size(x, kind=8))
      print *, "sorted: ", x

      allocate(weights(size(x)), source=1.0)
      print *, "weights: ", weights

   end subroutine partition

   ! in-place cumulative sum
   subroutine cumsum(x)
      real(kind=c_float), intent(inout) :: x(:)
      integer(kind=8) :: i

      do i = 2, size(x)
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
