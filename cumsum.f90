pure function cumsum(a) result (r)
real(dp), intent(in) :: a(:)
real(dp) :: r(size(a))
integer :: i
r(:) = [(sum(a(1:i)),i=1,size(a))]
end function cumsum

subroutine cumsum(a,b)
real(kind=r8) :: a(:),b(size(a))
integer(kind=i8) :: i
b(1)=a(1)
do i = 2, size(a)
    b(i) = b(i-1) + a(i)
enddo
return
end subroutine cumsum
