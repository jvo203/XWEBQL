program test
   use iso_c_binding
   use omp_lib
   implicit none

   call test_cumsum()

contains
   subroutine test_cumsum()
      real(kind=c_float) :: a(10)

      a = [1,2,3,4,5,6,7,8,9,10]

      print *, "Original array:"
      print *, a

      print *, "Cumulative sum:"
      call cumsum(a)
      print *, a

   end subroutine test_cumsum


   ! in-place cumulative sum
   subroutine cumsum(x)
      real(kind=c_float), intent(inout) :: x(:)
      integer(kind=8) :: i

      do i = 2, size(x)
         x(i) = x(i-1) + x(i)
      end do

   end subroutine cumsum
end program test
