module fbh
   use iso_c_binding
   implicit none

   type, bind(c) :: BayesHistogram
      type(c_ptr) :: centers, widths, heights
      integer(kind=c_int) :: n
   end type BayesHistogram

contains
   real(kind=c_float) function fast_bayesian_histogram(energy, n) bind(c)
      integer(kind=c_int64_t), intent(in) :: n
      real(kind=c_float), dimension(n), intent(inout) :: energy

      fast_bayesian_histogram = sum(energy)
   end function fast_bayesian_histogram
end module fbh
