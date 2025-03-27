module fbh
   use iso_c_binding
   implicit none

contains
   real(kind=c_float) function fast_bayesian_histogram(energy, n) bind(c)
      integer(kind=c_int), intent(in) :: n
      real(kind=c_float), dimension(n), intent(in) :: energy

      fast_bayesian_histogram = sum(energy)
   end function fast_bayesian_histogram
end module fbh
