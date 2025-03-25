pure function cumsum(a) result (r)
real(dp), intent(in) :: a(:)
real(dp) :: r(size(a))
integer :: i
r(:) = [(sum(a(1:i)),i=1,size(a))]
end function cumsum
