program test
   use iso_c_binding
   use omp_lib
   implicit none

contains
   subroutine test_bl()
      real(kind=c_float) :: a(10),b(10)
      integer :: i
      a = [1,2,3,4,5,6,7,8,9,10]

   end subroutine test_bl
end program test
