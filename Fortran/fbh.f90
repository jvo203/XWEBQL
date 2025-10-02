! From http://www.fortran-2000.com/rank/
! ORDERPACK by: Michel Olagnon

module m_mrgrnk

   use, intrinsic :: ISO_FORTRAN_ENV

   integer, parameter :: sp = REAL32
   integer, parameter :: kdp = REAL64

   public :: mrgrnk
   private :: kdp, sp
   private :: C_mrgrnk, D_mrgrnk, R_mrgrnk, I_mrgrnk

   interface mrgrnk
      module procedure C_mrgrnk, D_mrgrnk, R_mrgrnk, I_mrgrnk
   end interface mrgrnk
contains

   Subroutine C_mrgrnk (XDONT, IRNGT)
      ! __________________________________________________________
      !   MRGRNK = Merge-sort ranking of an array
      !   For performance reasons, the first 2 passes are taken
      !   out of the standard loop, and use dedicated coding.
      ! __________________________________________________________
      ! __________________________________________________________
      character(*), Dimension(:), Intent(In) :: XDONT
      Integer, Dimension(size(XDONT)), Intent(Out) :: IRNGT
      ! __________________________________________________________
      character(len(XDONT)) :: XVALA, XVALB
      !
      Integer, Dimension (SIZE(IRNGT)) :: JWRKT
      Integer :: LMTNA, LMTNC, IRNG1, IRNG2
      Integer :: NVAL, IIND, IWRKD, IWRK, IWRKF, JINDA, IINDA, IINDB
      !
      NVAL = SIZE(XDONT)
      Select Case (NVAL)
       Case (:0)
         Return
       Case (1)
         IRNGT (1) = 1
         Return
       Case Default
         Continue
      End Select
      !
      !  Fill-in the index array, creating ordered couples
      !
      Do IIND = 2, NVAL, 2
         If (XDONT(IIND-1) <= XDONT(IIND)) Then
            IRNGT (IIND-1) = IIND - 1
            IRNGT (IIND) = IIND
         Else
            IRNGT (IIND-1) = IIND
            IRNGT (IIND) = IIND - 1
         End If
      End Do
      If (Modulo(NVAL, 2) /= 0) Then
         IRNGT (NVAL) = NVAL
      End If
      !
      !  We will now have ordered subsets A - B - A - B - ...
      !  and merge A and B couples into     C   -   C   - ...
      !
      LMTNA = 2
      LMTNC = 4
      !
      !  First iteration. The length of the ordered subsets goes from 2 to 4
      !
      Do
         If (NVAL <= 2) Exit
         !
         !   Loop on merges of A and B into C
         !
         Do IWRKD = 0, NVAL - 1, 4
            If ((IWRKD+4) > NVAL) Then
               If ((IWRKD+2) >= NVAL) Exit
               !
               !   1 2 3
               !
               If (XDONT(IRNGT(IWRKD+2)) <= XDONT(IRNGT(IWRKD+3))) Exit
               !
               !   1 3 2
               !
               If (XDONT(IRNGT(IWRKD+1)) <= XDONT(IRNGT(IWRKD+3))) Then
                  IRNG2 = IRNGT (IWRKD+2)
                  IRNGT (IWRKD+2) = IRNGT (IWRKD+3)
                  IRNGT (IWRKD+3) = IRNG2
                  !
                  !   3 1 2
                  !
               Else
                  IRNG1 = IRNGT (IWRKD+1)
                  IRNGT (IWRKD+1) = IRNGT (IWRKD+3)
                  IRNGT (IWRKD+3) = IRNGT (IWRKD+2)
                  IRNGT (IWRKD+2) = IRNG1
               End If
               Exit
            End If
            !
            !   1 2 3 4
            !
            If (XDONT(IRNGT(IWRKD+2)) <= XDONT(IRNGT(IWRKD+3))) Cycle
            !
            !   1 3 x x
            !
            If (XDONT(IRNGT(IWRKD+1)) <= XDONT(IRNGT(IWRKD+3))) Then
               IRNG2 = IRNGT (IWRKD+2)
               IRNGT (IWRKD+2) = IRNGT (IWRKD+3)
               If (XDONT(IRNG2) <= XDONT(IRNGT(IWRKD+4))) Then
                  !   1 3 2 4
                  IRNGT (IWRKD+3) = IRNG2
               Else
                  !   1 3 4 2
                  IRNGT (IWRKD+3) = IRNGT (IWRKD+4)
                  IRNGT (IWRKD+4) = IRNG2
               End If
               !
               !   3 x x x
               !
            Else
               IRNG1 = IRNGT (IWRKD+1)
               IRNG2 = IRNGT (IWRKD+2)
               IRNGT (IWRKD+1) = IRNGT (IWRKD+3)
               If (XDONT(IRNG1) <= XDONT(IRNGT(IWRKD+4))) Then
                  IRNGT (IWRKD+2) = IRNG1
                  If (XDONT(IRNG2) <= XDONT(IRNGT(IWRKD+4))) Then
                     !   3 1 2 4
                     IRNGT (IWRKD+3) = IRNG2
                  Else
                     !   3 1 4 2
                     IRNGT (IWRKD+3) = IRNGT (IWRKD+4)
                     IRNGT (IWRKD+4) = IRNG2
                  End If
               Else
                  !   3 4 1 2
                  IRNGT (IWRKD+2) = IRNGT (IWRKD+4)
                  IRNGT (IWRKD+3) = IRNG1
                  IRNGT (IWRKD+4) = IRNG2
               End If
            End If
         End Do
         !
         !  The Cs become As and Bs
         !
         LMTNA = 4
         Exit
      End Do
      !
      !  Iteration loop. Each time, the length of the ordered subsets
      !  is doubled.
      !
      Do
         If (LMTNA >= NVAL) Exit
         IWRKF = 0
         LMTNC = 2 * LMTNC
         !
         !   Loop on merges of A and B into C
         !
         Do
            IWRK = IWRKF
            IWRKD = IWRKF + 1
            JINDA = IWRKF + LMTNA
            IWRKF = IWRKF + LMTNC
            If (IWRKF >= NVAL) Then
               If (JINDA >= NVAL) Exit
               IWRKF = NVAL
            End If
            IINDA = 1
            IINDB = JINDA + 1
            !
            !   Shortcut for the case when the max of A is smaller
            !   than the min of B. This line may be activated when the
            !   initial set is already close to sorted.
            !
            !          IF (XDONT(IRNGT(JINDA)) <= XDONT(IRNGT(IINDB))) CYCLE
            !
            !  One steps in the C subset, that we build in the final rank array
            !
            !  Make a copy of the rank array for the merge iteration
            !
            JWRKT (1:LMTNA) = IRNGT (IWRKD:JINDA)
            !
            XVALA = XDONT (JWRKT(IINDA))
            XVALB = XDONT (IRNGT(IINDB))
            !
            Do
               IWRK = IWRK + 1
               !
               !  We still have unprocessed values in both A and B
               !
               If (XVALA > XVALB) Then
                  IRNGT (IWRK) = IRNGT (IINDB)
                  IINDB = IINDB + 1
                  If (IINDB > IWRKF) Then
                     !  Only A still with unprocessed values
                     IRNGT (IWRK+1:IWRKF) = JWRKT (IINDA:LMTNA)
                     Exit
                  End If
                  XVALB = XDONT (IRNGT(IINDB))
               Else
                  IRNGT (IWRK) = JWRKT (IINDA)
                  IINDA = IINDA + 1
                  If (IINDA > LMTNA) Exit! Only B still with unprocessed values
                  XVALA = XDONT (JWRKT(IINDA))
               End If
               !
            End Do
         End Do
         !
         !  The Cs become As and Bs
         !
         LMTNA = 2 * LMTNA
      End Do
      !
      Return
      !
   End Subroutine C_mrgrnk

   Subroutine D_mrgrnk (XDONT, IRNGT)
      ! __________________________________________________________
      !   MRGRNK = Merge-sort ranking of an array
      !   For performance reasons, the first 2 passes are taken
      !   out of the standard loop, and use dedicated coding.
      ! __________________________________________________________
      ! __________________________________________________________
      Real (kind=kdp), Dimension (:), Intent (In) :: XDONT
      Integer, Dimension(size(XDONT)), Intent(Out) :: IRNGT
      ! __________________________________________________________
      Real (kind=kdp) :: XVALA, XVALB
      !
      Integer, Dimension (SIZE(IRNGT)) :: JWRKT
      Integer :: LMTNA, LMTNC, IRNG1, IRNG2
      Integer :: NVAL, IIND, IWRKD, IWRK, IWRKF, JINDA, IINDA, IINDB
      !
      NVAL = SIZE(XDONT)
      Select Case (NVAL)
       Case (:0)
         Return
       Case (1)
         IRNGT (1) = 1
         Return
       Case Default
         Continue
      End Select
      !
      !  Fill-in the index array, creating ordered couples
      !
      Do IIND = 2, NVAL, 2
         If (XDONT(IIND-1) <= XDONT(IIND)) Then
            IRNGT (IIND-1) = IIND - 1
            IRNGT (IIND) = IIND
         Else
            IRNGT (IIND-1) = IIND
            IRNGT (IIND) = IIND - 1
         End If
      End Do
      If (Modulo(NVAL, 2) /= 0) Then
         IRNGT (NVAL) = NVAL
      End If
      !
      !  We will now have ordered subsets A - B - A - B - ...
      !  and merge A and B couples into     C   -   C   - ...
      !
      LMTNA = 2
      LMTNC = 4
      !
      !  First iteration. The length of the ordered subsets goes from 2 to 4
      !
      Do
         If (NVAL <= 2) Exit
         !
         !   Loop on merges of A and B into C
         !
         Do IWRKD = 0, NVAL - 1, 4
            If ((IWRKD+4) > NVAL) Then
               If ((IWRKD+2) >= NVAL) Exit
               !
               !   1 2 3
               !
               If (XDONT(IRNGT(IWRKD+2)) <= XDONT(IRNGT(IWRKD+3))) Exit
               !
               !   1 3 2
               !
               If (XDONT(IRNGT(IWRKD+1)) <= XDONT(IRNGT(IWRKD+3))) Then
                  IRNG2 = IRNGT (IWRKD+2)
                  IRNGT (IWRKD+2) = IRNGT (IWRKD+3)
                  IRNGT (IWRKD+3) = IRNG2
                  !
                  !   3 1 2
                  !
               Else
                  IRNG1 = IRNGT (IWRKD+1)
                  IRNGT (IWRKD+1) = IRNGT (IWRKD+3)
                  IRNGT (IWRKD+3) = IRNGT (IWRKD+2)
                  IRNGT (IWRKD+2) = IRNG1
               End If
               Exit
            End If
            !
            !   1 2 3 4
            !
            If (XDONT(IRNGT(IWRKD+2)) <= XDONT(IRNGT(IWRKD+3))) Cycle
            !
            !   1 3 x x
            !
            If (XDONT(IRNGT(IWRKD+1)) <= XDONT(IRNGT(IWRKD+3))) Then
               IRNG2 = IRNGT (IWRKD+2)
               IRNGT (IWRKD+2) = IRNGT (IWRKD+3)
               If (XDONT(IRNG2) <= XDONT(IRNGT(IWRKD+4))) Then
                  !   1 3 2 4
                  IRNGT (IWRKD+3) = IRNG2
               Else
                  !   1 3 4 2
                  IRNGT (IWRKD+3) = IRNGT (IWRKD+4)
                  IRNGT (IWRKD+4) = IRNG2
               End If
               !
               !   3 x x x
               !
            Else
               IRNG1 = IRNGT (IWRKD+1)
               IRNG2 = IRNGT (IWRKD+2)
               IRNGT (IWRKD+1) = IRNGT (IWRKD+3)
               If (XDONT(IRNG1) <= XDONT(IRNGT(IWRKD+4))) Then
                  IRNGT (IWRKD+2) = IRNG1
                  If (XDONT(IRNG2) <= XDONT(IRNGT(IWRKD+4))) Then
                     !   3 1 2 4
                     IRNGT (IWRKD+3) = IRNG2
                  Else
                     !   3 1 4 2
                     IRNGT (IWRKD+3) = IRNGT (IWRKD+4)
                     IRNGT (IWRKD+4) = IRNG2
                  End If
               Else
                  !   3 4 1 2
                  IRNGT (IWRKD+2) = IRNGT (IWRKD+4)
                  IRNGT (IWRKD+3) = IRNG1
                  IRNGT (IWRKD+4) = IRNG2
               End If
            End If
         End Do
         !
         !  The Cs become As and Bs
         !
         LMTNA = 4
         Exit
      End Do
      !
      !  Iteration loop. Each time, the length of the ordered subsets
      !  is doubled.
      !
      Do
         If (LMTNA >= NVAL) Exit
         IWRKF = 0
         LMTNC = 2 * LMTNC
         !
         !   Loop on merges of A and B into C
         !
         Do
            IWRK = IWRKF
            IWRKD = IWRKF + 1
            JINDA = IWRKF + LMTNA
            IWRKF = IWRKF + LMTNC
            If (IWRKF >= NVAL) Then
               If (JINDA >= NVAL) Exit
               IWRKF = NVAL
            End If
            IINDA = 1
            IINDB = JINDA + 1
            !
            !   Shortcut for the case when the max of A is smaller
            !   than the min of B. This line may be activated when the
            !   initial set is already close to sorted.
            !
            !          IF (XDONT(IRNGT(JINDA)) <= XDONT(IRNGT(IINDB))) CYCLE
            !
            !  One steps in the C subset, that we build in the final rank array
            !
            !  Make a copy of the rank array for the merge iteration
            !
            JWRKT (1:LMTNA) = IRNGT (IWRKD:JINDA)
            !
            XVALA = XDONT (JWRKT(IINDA))
            XVALB = XDONT (IRNGT(IINDB))
            !
            Do
               IWRK = IWRK + 1
               !
               !  We still have unprocessed values in both A and B
               !
               If (XVALA > XVALB) Then
                  IRNGT (IWRK) = IRNGT (IINDB)
                  IINDB = IINDB + 1
                  If (IINDB > IWRKF) Then
                     !  Only A still with unprocessed values
                     IRNGT (IWRK+1:IWRKF) = JWRKT (IINDA:LMTNA)
                     Exit
                  End If
                  XVALB = XDONT (IRNGT(IINDB))
               Else
                  IRNGT (IWRK) = JWRKT (IINDA)
                  IINDA = IINDA + 1
                  If (IINDA > LMTNA) Exit! Only B still with unprocessed values
                  XVALA = XDONT (JWRKT(IINDA))
               End If
               !
            End Do
         End Do
         !
         !  The Cs become As and Bs
         !
         LMTNA = 2 * LMTNA
      End Do
      !
      Return
      !
   End Subroutine D_mrgrnk

   Subroutine R_mrgrnk (XDONT, IRNGT)
      ! __________________________________________________________
      !   MRGRNK = Merge-sort ranking of an array
      !   For performance reasons, the first 2 passes are taken
      !   out of the standard loop, and use dedicated coding.
      ! __________________________________________________________
      ! _________________________________________________________
      Real(kind=sp), Dimension (:), Intent (In) :: XDONT
      Integer, Dimension(size(XDONT)), Intent(Out) :: IRNGT
      ! __________________________________________________________
      Real(kind=sp) :: XVALA, XVALB
      !
      Integer, Dimension (SIZE(IRNGT)) :: JWRKT
      Integer :: LMTNA, LMTNC, IRNG1, IRNG2
      Integer :: NVAL, IIND, IWRKD, IWRK, IWRKF, JINDA, IINDA, IINDB
      !
      NVAL = SIZE(XDONT)
      Select Case (NVAL)
       Case (:0)
         Return
       Case (1)
         IRNGT (1) = 1
         Return
       Case Default
         Continue
      End Select
      !
      !  Fill-in the index array, creating ordered couples
      !
      Do IIND = 2, NVAL, 2
         If (XDONT(IIND-1) <= XDONT(IIND)) Then
            IRNGT (IIND-1) = IIND - 1
            IRNGT (IIND) = IIND
         Else
            IRNGT (IIND-1) = IIND
            IRNGT (IIND) = IIND - 1
         End If
      End Do
      If (Modulo(NVAL, 2) /= 0) Then
         IRNGT (NVAL) = NVAL
      End If
      !
      !  We will now have ordered subsets A - B - A - B - ...
      !  and merge A and B couples into     C   -   C   - ...
      !
      LMTNA = 2
      LMTNC = 4
      !
      !  First iteration. The length of the ordered subsets goes from 2 to 4
      !
      Do
         If (NVAL <= 2) Exit
         !
         !   Loop on merges of A and B into C
         !
         Do IWRKD = 0, NVAL - 1, 4
            If ((IWRKD+4) > NVAL) Then
               If ((IWRKD+2) >= NVAL) Exit
               !
               !   1 2 3
               !
               If (XDONT(IRNGT(IWRKD+2)) <= XDONT(IRNGT(IWRKD+3))) Exit
               !
               !   1 3 2
               !
               If (XDONT(IRNGT(IWRKD+1)) <= XDONT(IRNGT(IWRKD+3))) Then
                  IRNG2 = IRNGT (IWRKD+2)
                  IRNGT (IWRKD+2) = IRNGT (IWRKD+3)
                  IRNGT (IWRKD+3) = IRNG2
                  !
                  !   3 1 2
                  !
               Else
                  IRNG1 = IRNGT (IWRKD+1)
                  IRNGT (IWRKD+1) = IRNGT (IWRKD+3)
                  IRNGT (IWRKD+3) = IRNGT (IWRKD+2)
                  IRNGT (IWRKD+2) = IRNG1
               End If
               Exit
            End If
            !
            !   1 2 3 4
            !
            If (XDONT(IRNGT(IWRKD+2)) <= XDONT(IRNGT(IWRKD+3))) Cycle
            !
            !   1 3 x x
            !
            If (XDONT(IRNGT(IWRKD+1)) <= XDONT(IRNGT(IWRKD+3))) Then
               IRNG2 = IRNGT (IWRKD+2)
               IRNGT (IWRKD+2) = IRNGT (IWRKD+3)
               If (XDONT(IRNG2) <= XDONT(IRNGT(IWRKD+4))) Then
                  !   1 3 2 4
                  IRNGT (IWRKD+3) = IRNG2
               Else
                  !   1 3 4 2
                  IRNGT (IWRKD+3) = IRNGT (IWRKD+4)
                  IRNGT (IWRKD+4) = IRNG2
               End If
               !
               !   3 x x x
               !
            Else
               IRNG1 = IRNGT (IWRKD+1)
               IRNG2 = IRNGT (IWRKD+2)
               IRNGT (IWRKD+1) = IRNGT (IWRKD+3)
               If (XDONT(IRNG1) <= XDONT(IRNGT(IWRKD+4))) Then
                  IRNGT (IWRKD+2) = IRNG1
                  If (XDONT(IRNG2) <= XDONT(IRNGT(IWRKD+4))) Then
                     !   3 1 2 4
                     IRNGT (IWRKD+3) = IRNG2
                  Else
                     !   3 1 4 2
                     IRNGT (IWRKD+3) = IRNGT (IWRKD+4)
                     IRNGT (IWRKD+4) = IRNG2
                  End If
               Else
                  !   3 4 1 2
                  IRNGT (IWRKD+2) = IRNGT (IWRKD+4)
                  IRNGT (IWRKD+3) = IRNG1
                  IRNGT (IWRKD+4) = IRNG2
               End If
            End If
         End Do
         !
         !  The Cs become As and Bs
         !
         LMTNA = 4
         Exit
      End Do
      !
      !  Iteration loop. Each time, the length of the ordered subsets
      !  is doubled.
      !
      Do
         If (LMTNA >= NVAL) Exit
         IWRKF = 0
         LMTNC = 2 * LMTNC
         !
         !   Loop on merges of A and B into C
         !
         Do
            IWRK = IWRKF
            IWRKD = IWRKF + 1
            JINDA = IWRKF + LMTNA
            IWRKF = IWRKF + LMTNC
            If (IWRKF >= NVAL) Then
               If (JINDA >= NVAL) Exit
               IWRKF = NVAL
            End If
            IINDA = 1
            IINDB = JINDA + 1
            !
            !   Shortcut for the case when the max of A is smaller
            !   than the min of B. This line may be activated when the
            !   initial set is already close to sorted.
            !
            !          IF (XDONT(IRNGT(JINDA)) <= XDONT(IRNGT(IINDB))) CYCLE
            !
            !  One steps in the C subset, that we build in the final rank array
            !
            !  Make a copy of the rank array for the merge iteration
            !
            JWRKT (1:LMTNA) = IRNGT (IWRKD:JINDA)
            !
            XVALA = XDONT (JWRKT(IINDA))
            XVALB = XDONT (IRNGT(IINDB))
            !
            Do
               IWRK = IWRK + 1
               !
               !  We still have unprocessed values in both A and B
               !
               If (XVALA > XVALB) Then
                  IRNGT (IWRK) = IRNGT (IINDB)
                  IINDB = IINDB + 1
                  If (IINDB > IWRKF) Then
                     !  Only A still with unprocessed values
                     IRNGT (IWRK+1:IWRKF) = JWRKT (IINDA:LMTNA)
                     Exit
                  End If
                  XVALB = XDONT (IRNGT(IINDB))
               Else
                  IRNGT (IWRK) = JWRKT (IINDA)
                  IINDA = IINDA + 1
                  If (IINDA > LMTNA) Exit! Only B still with unprocessed values
                  XVALA = XDONT (JWRKT(IINDA))
               End If
               !
            End Do
         End Do
         !
         !  The Cs become As and Bs
         !
         LMTNA = 2 * LMTNA
      End Do
      !
      Return
      !
   End Subroutine R_mrgrnk

   Subroutine I_mrgrnk (XDONT, IRNGT)
      ! __________________________________________________________
      !   MRGRNK = Merge-sort ranking of an array
      !   For performance reasons, the first 2 passes are taken
      !   out of the standard loop, and use dedicated coding.
      ! __________________________________________________________
      ! __________________________________________________________
      Integer, Dimension (:), Intent (In)  :: XDONT
      Integer, Dimension(size(XDONT)), Intent(Out) :: IRNGT
      ! __________________________________________________________
      Integer :: XVALA, XVALB
      !
      Integer, Dimension (SIZE(IRNGT)) :: JWRKT
      Integer :: LMTNA, LMTNC, IRNG1, IRNG2
      Integer :: NVAL, IIND, IWRKD, IWRK, IWRKF, JINDA, IINDA, IINDB
      !
      NVAL = SIZE(XDONT)
      Select Case (NVAL)
       Case (:0)
         Return
       Case (1)
         IRNGT (1) = 1
         Return
       Case Default
         Continue
      End Select
      !
      !  Fill-in the index array, creating ordered couples
      !
      Do IIND = 2, NVAL, 2
         If (XDONT(IIND-1) <= XDONT(IIND)) Then
            IRNGT (IIND-1) = IIND - 1
            IRNGT (IIND) = IIND
         Else
            IRNGT (IIND-1) = IIND
            IRNGT (IIND) = IIND - 1
         End If
      End Do
      If (Modulo(NVAL, 2) /= 0) Then
         IRNGT (NVAL) = NVAL
      End If
      !
      !  We will now have ordered subsets A - B - A - B - ...
      !  and merge A and B couples into     C   -   C   - ...
      !
      LMTNA = 2
      LMTNC = 4
      !
      !  First iteration. The length of the ordered subsets goes from 2 to 4
      !
      Do
         If (NVAL <= 2) Exit
         !
         !   Loop on merges of A and B into C
         !
         Do IWRKD = 0, NVAL - 1, 4
            If ((IWRKD+4) > NVAL) Then
               If ((IWRKD+2) >= NVAL) Exit
               !
               !   1 2 3
               !
               If (XDONT(IRNGT(IWRKD+2)) <= XDONT(IRNGT(IWRKD+3))) Exit
               !
               !   1 3 2
               !
               If (XDONT(IRNGT(IWRKD+1)) <= XDONT(IRNGT(IWRKD+3))) Then
                  IRNG2 = IRNGT (IWRKD+2)
                  IRNGT (IWRKD+2) = IRNGT (IWRKD+3)
                  IRNGT (IWRKD+3) = IRNG2
                  !
                  !   3 1 2
                  !
               Else
                  IRNG1 = IRNGT (IWRKD+1)
                  IRNGT (IWRKD+1) = IRNGT (IWRKD+3)
                  IRNGT (IWRKD+3) = IRNGT (IWRKD+2)
                  IRNGT (IWRKD+2) = IRNG1
               End If
               Exit
            End If
            !
            !   1 2 3 4
            !
            If (XDONT(IRNGT(IWRKD+2)) <= XDONT(IRNGT(IWRKD+3))) Cycle
            !
            !   1 3 x x
            !
            If (XDONT(IRNGT(IWRKD+1)) <= XDONT(IRNGT(IWRKD+3))) Then
               IRNG2 = IRNGT (IWRKD+2)
               IRNGT (IWRKD+2) = IRNGT (IWRKD+3)
               If (XDONT(IRNG2) <= XDONT(IRNGT(IWRKD+4))) Then
                  !   1 3 2 4
                  IRNGT (IWRKD+3) = IRNG2
               Else
                  !   1 3 4 2
                  IRNGT (IWRKD+3) = IRNGT (IWRKD+4)
                  IRNGT (IWRKD+4) = IRNG2
               End If
               !
               !   3 x x x
               !
            Else
               IRNG1 = IRNGT (IWRKD+1)
               IRNG2 = IRNGT (IWRKD+2)
               IRNGT (IWRKD+1) = IRNGT (IWRKD+3)
               If (XDONT(IRNG1) <= XDONT(IRNGT(IWRKD+4))) Then
                  IRNGT (IWRKD+2) = IRNG1
                  If (XDONT(IRNG2) <= XDONT(IRNGT(IWRKD+4))) Then
                     !   3 1 2 4
                     IRNGT (IWRKD+3) = IRNG2
                  Else
                     !   3 1 4 2
                     IRNGT (IWRKD+3) = IRNGT (IWRKD+4)
                     IRNGT (IWRKD+4) = IRNG2
                  End If
               Else
                  !   3 4 1 2
                  IRNGT (IWRKD+2) = IRNGT (IWRKD+4)
                  IRNGT (IWRKD+3) = IRNG1
                  IRNGT (IWRKD+4) = IRNG2
               End If
            End If
         End Do
         !
         !  The Cs become As and Bs
         !
         LMTNA = 4
         Exit
      End Do
      !
      !  Iteration loop. Each time, the length of the ordered subsets
      !  is doubled.
      !
      Do
         If (LMTNA >= NVAL) Exit
         IWRKF = 0
         LMTNC = 2 * LMTNC
         !
         !   Loop on merges of A and B into C
         !
         Do
            IWRK = IWRKF
            IWRKD = IWRKF + 1
            JINDA = IWRKF + LMTNA
            IWRKF = IWRKF + LMTNC
            If (IWRKF >= NVAL) Then
               If (JINDA >= NVAL) Exit
               IWRKF = NVAL
            End If
            IINDA = 1
            IINDB = JINDA + 1
            !
            !   Shortcut for the case when the max of A is smaller
            !   than the min of B. This line may be activated when the
            !   initial set is already close to sorted.
            !
            !          IF (XDONT(IRNGT(JINDA)) <= XDONT(IRNGT(IINDB))) CYCLE
            !
            !  One steps in the C subset, that we build in the final rank array
            !
            !  Make a copy of the rank array for the merge iteration
            !
            JWRKT (1:LMTNA) = IRNGT (IWRKD:JINDA)
            !
            XVALA = XDONT (JWRKT(IINDA))
            XVALB = XDONT (IRNGT(IINDB))
            !
            Do
               IWRK = IWRK + 1
               !
               !  We still have unprocessed values in both A and B
               !
               If (XVALA > XVALB) Then
                  IRNGT (IWRK) = IRNGT (IINDB)
                  IINDB = IINDB + 1
                  If (IINDB > IWRKF) Then
                     !  Only A still with unprocessed values
                     IRNGT (IWRK+1:IWRKF) = JWRKT (IINDA:LMTNA)
                     Exit
                  End If
                  XVALB = XDONT (IRNGT(IINDB))
               Else
                  IRNGT (IWRK) = JWRKT (IINDA)
                  IINDA = IINDA + 1
                  If (IINDA > LMTNA) Exit! Only B still with unprocessed values
                  XVALA = XDONT (JWRKT(IINDA))
               End If
               !
            End Do
         End Do
         !
         !  The Cs become As and Bs
         !
         LMTNA = 2 * LMTNA
      End Do
      !
      Return
      !
   End Subroutine I_mrgrnk
end module m_mrgrnk

module mod_sort
! Parallel sorting routines by: Corentin Cadiou and Steve Rivkin

   use omp_lib
   use m_mrgrnk

   implicit none

   private
   public :: parallel_sort

   interface parallel_sort
      module procedure C_parallel_sort, D_parallel_sort, R_parallel_sort, I_parallel_sort
   end interface parallel_sort
contains

   subroutine C_parallel_sort (A, order)
      character(*), intent(in),  dimension(:) :: A
      integer, intent(out), dimension(size(A)) :: order

      integer :: ilen, from, middle, ito, nthreads, thread, chunk, chunk2, i

      ilen     = size(A)
      nthreads = omp_get_max_threads()
      chunk    = ceiling(dble(ilen) / nthreads)

      !----------------------------------------
      ! Initialize order
      !----------------------------------------
      !$OMP parallel do shared(order) schedule(static)
      do i = 1, ilen
         order(i) = i
      end do
      !$OMP end parallel do

      !----------------------------------------
      ! Sort each chunk
      !----------------------------------------
      !$OMP parallel do default(shared) private(thread, from, ito) schedule(static)
      do thread = 0, nthreads - 1
         from = thread*chunk + 1
         ito  = min((thread + 1)*chunk, ilen)

         call mrgrnk(A(from:ito), order(from:ito))
         order(from:ito) = order(from:ito) + from - 1
      end do
      !$OMP end parallel do

      !----------------------------------------
      ! Merge pieces together
      !----------------------------------------
      i = 1
      chunk2 = chunk
      do while (chunk2 < size(A))

         !$OMP parallel do default(shared) private(thread, from, middle, ito)
         do thread = 0, ceiling(.5 * size(A) / chunk2)
            from   = thread*2     * chunk2 + 1
            middle = (thread*2 + 1) * chunk2
            ito     = (thread*2 + 2) * chunk2

            middle = min(middle, size(A))
            ito     = min(ito, size(A))
            if (from < ito) then
               call C_merge(A, order, from, middle, ito)
            end if
         end do
         !$OMP end parallel do

         chunk2 = chunk2 * 2
         i = i + 1
      end do
   end subroutine C_parallel_sort

   !> Merge two parts of A, ordered by order from left to right
   !! around middle.
   subroutine C_merge (A, order, left, middle, right)
      character(*), intent(in), dimension(:) :: A
      integer, intent(inout), dimension(size(A)) :: order

      integer, intent(in) :: left, middle, right

      integer :: leftA, rightA, leftB, rightB
      integer :: iA, iB, i

      integer, dimension(left    :middle) :: orderA
      integer, dimension(middle+1:right ) :: orderB

      ! copy order
      orderA = order(left    :middle)
      orderB = order(middle+1:right)

      ! more explicit variables
      leftA  = left
      rightA = middle
      leftB  = middle+1
      rightB = right

      ! initialize iA, iB to their leftmost position
      iA = leftA
      iB = leftB

      i = leftA

      do while ((iA <= rightA) .and. (iB <= rightB))
         if (A(orderA(iA)) <= A(orderB(iB))) then
            order(i) = orderA(iA)
            iA = iA + 1
         else
            order(i) = orderB(iB)
            iB = iB + 1
         end if

         i = i + 1
      end do

      ! either A or B still have elements, append them to the new order
      do while (iA <= rightA)
         order(i) = orderA(iA)
         iA = iA + 1

         i  = i + 1
      end do

      do while (iB <= rightB)
         order(i) = orderB(iB)
         iB = iB + 1

         i  = i + 1
      end do

   end subroutine C_merge

   subroutine D_parallel_sort (A, order)
      real(8), intent(in),  dimension(:) :: A
      integer, intent(out), dimension(size(A)) :: order

      integer :: ilen, from, middle, ito, nthreads, thread, chunk, chunk2, i

      ilen      = size(A)
      nthreads = omp_get_max_threads()
      chunk    = ceiling(dble(ilen) / nthreads)

      !----------------------------------------
      ! Initialize order
      !----------------------------------------
      !$OMP parallel do shared(order) schedule(static)
      do i = 1, ilen
         order(i) = i
      end do
      !$OMP end parallel do

      !----------------------------------------
      ! Sort each chunk
      !----------------------------------------
      !$OMP parallel do default(shared) private(thread, from, ito) schedule(static)
      do thread = 0, nthreads - 1
         from = thread*chunk + 1
         ito  = min((thread + 1)*chunk, ilen)

         call mrgrnk(A(from:ito), order(from:ito))
         order(from:ito) = order(from:ito) + from - 1
      end do
      !$OMP end parallel do

      !----------------------------------------
      ! Merge pieces together
      !----------------------------------------
      i = 1
      chunk2 = chunk
      do while (chunk2 < size(A))

         !$OMP parallel do default(shared) private(thread, from, middle, ito)
         do thread = 0, ceiling(.5 * size(A) / chunk2)
            from   = thread*2     * chunk2 + 1
            middle = (thread*2 + 1) * chunk2
            ito     = (thread*2 + 2) * chunk2

            middle = min(middle, size(A))
            ito     = min(ito, size(A))
            if (from < ito) then
               call D_merge(A, order, from, middle, ito)
            end if
         end do
         !$OMP end parallel do

         chunk2 = chunk2 * 2
         i = i + 1
      end do
   end subroutine D_parallel_sort

   !> Merge two parts of A, ordered by order from left to right
   !! around middle.
   subroutine D_merge (A, order, left, middle, right)
      real(8), intent(in), dimension(:) :: A
      integer, intent(inout), dimension(size(A)) :: order

      integer, intent(in) :: left, middle, right

      integer :: leftA, rightA, leftB, rightB
      integer :: iA, iB, i

      integer, dimension(left    :middle) :: orderA
      integer, dimension(middle+1:right ) :: orderB

      ! copy order
      orderA = order(left    :middle)
      orderB = order(middle+1:right)

      ! more explicit variables
      leftA  = left
      rightA = middle
      leftB  = middle+1
      rightB = right

      ! initialize iA, iB to their leftmost position
      iA = leftA
      iB = leftB

      i = leftA

      do while ((iA <= rightA) .and. (iB <= rightB))
         if (A(orderA(iA)) <= A(orderB(iB))) then
            order(i) = orderA(iA)
            iA = iA + 1
         else
            order(i) = orderB(iB)
            iB = iB + 1
         end if

         i = i + 1
      end do

      ! either A or B still have elements, append them to the new order
      do while (iA <= rightA)
         order(i) = orderA(iA)
         iA = iA + 1

         i  = i + 1

      end do
      do while (iB <= rightB)
         order(i) = orderB(iB)
         iB = iB + 1

         i  = i + 1
      end do

   end subroutine D_merge

   subroutine R_parallel_sort (A, order)
      real(4), intent(in),  dimension(:) :: A
      integer, intent(out), dimension(size(A)) :: order

      integer :: ilen, from, middle, ito, nthreads, thread, chunk, chunk2, i

      ilen      = size(A)
      nthreads = omp_get_max_threads()
      chunk    = ceiling(dble(ilen) / nthreads)

      !----------------------------------------
      ! Initialize order
      !----------------------------------------
      !$OMP parallel do shared(order) schedule(static)
      do i = 1, ilen
         order(i) = i
      end do
      !$OMP end parallel do

      !----------------------------------------
      ! Sort each chunk
      !----------------------------------------
      !$OMP parallel do default(shared) private(thread, from, ito) schedule(static)
      do thread = 0, nthreads - 1
         from = thread*chunk + 1
         ito  = min((thread + 1)*chunk, ilen)

         call mrgrnk(A(from:ito), order(from:ito))
         order(from:ito) = order(from:ito) + from - 1
      end do
      !$OMP end parallel do

      !----------------------------------------
      ! Merge pieces together
      !----------------------------------------
      i = 1
      chunk2 = chunk
      do while (chunk2 < size(A))

         !$OMP parallel do default(shared) private(thread, from, middle, ito)
         do thread = 0, ceiling(.5 * size(A) / chunk2)
            from   = thread*2     * chunk2 + 1
            middle = (thread*2 + 1) * chunk2
            ito     = (thread*2 + 2) * chunk2

            middle = min(middle, size(A))
            ito     = min(ito, size(A))
            if (from < ito) then
               call R_merge(A, order, from, middle, ito)
            end if
         end do
         !$OMP end parallel do

         chunk2 = chunk2 * 2
         i = i + 1
      end do
   end subroutine R_parallel_sort

   !> Merge two parts of A, ordered by order from left to right
   !! around middle.
   subroutine R_merge (A, order, left, middle, right)
      real(4), intent(in), dimension(:) :: A
      integer, intent(inout), dimension(size(A)) :: order

      integer, intent(in) :: left, middle, right

      integer :: leftA, rightA, leftB, rightB
      integer :: iA, iB, i

      integer, dimension(left    :middle) :: orderA
      integer, dimension(middle+1:right ) :: orderB

      ! copy order
      orderA = order(left    :middle)
      orderB = order(middle+1:right)

      ! more explicit variables
      leftA  = left
      rightA = middle
      leftB  = middle+1
      rightB = right

      ! initialize iA, iB to their leftmost position
      iA = leftA
      iB = leftB

      i = leftA

      do while ((iA <= rightA) .and. (iB <= rightB))
         if (A(orderA(iA)) <= A(orderB(iB))) then
            order(i) = orderA(iA)
            iA = iA + 1
         else
            order(i) = orderB(iB)
            iB = iB + 1
         end if

         i = i + 1
      end do

      ! either A or B still have elements, append them to the new order
      do while (iA <= rightA)
         order(i) = orderA(iA)
         iA = iA + 1

         i  = i + 1

      end do
      do while (iB <= rightB)
         order(i) = orderB(iB)
         iB = iB + 1

         i  = i + 1
      end do

   end subroutine R_merge

   subroutine I_parallel_sort (A, order)
      integer, intent(in),  dimension(:) :: A
      integer, intent(out), dimension(size(A)) :: order

      integer :: ilen, from, middle, ito, nthreads, thread, chunk, chunk2, i

      ilen      = size(A)
      nthreads = omp_get_max_threads()
      chunk    = ceiling(dble(ilen) / nthreads)

      !----------------------------------------
      ! Initialize order
      !----------------------------------------
      !$OMP parallel do shared(order) schedule(static)
      do i = 1, ilen
         order(i) = i
      end do
      !$OMP end parallel do

      !----------------------------------------
      ! Sort each chunk
      !----------------------------------------
      !$OMP parallel do default(shared) private(thread, from, ito) schedule(static)
      do thread = 0, nthreads - 1
         from = thread*chunk + 1
         ito  = min((thread + 1)*chunk, ilen)

         call mrgrnk(A(from:ito), order(from:ito))
         order(from:ito) = order(from:ito) + from - 1
      end do
      !$OMP end parallel do

      !----------------------------------------
      ! Merge pieces together
      !----------------------------------------
      i = 1
      chunk2 = chunk
      do while (chunk2 < size(A))

         !$OMP parallel do default(shared) private(thread, from, middle, ito)
         do thread = 0, ceiling(.5 * size(A) / chunk2)
            from   = thread*2     * chunk2 + 1
            middle = (thread*2 + 1) * chunk2
            ito     = (thread*2 + 2) * chunk2

            middle = min(middle, size(A))
            ito     = min(ito, size(A))
            if (from < ito) then
               call I_merge(A, order, from, middle, ito)
            end if
         end do
         !$OMP end parallel do

         chunk2 = chunk2 * 2
         i = i + 1
      end do
   end subroutine I_parallel_sort

   !> Merge two parts of A, ordered by order from left to right
   !! around middle.
   subroutine I_merge (A, order, left, middle, right)
      integer, intent(in), dimension(:) :: A
      integer, intent(inout), dimension(size(A)) :: order

      integer, intent(in) :: left, middle, right

      integer :: leftA, rightA, leftB, rightB
      integer :: iA, iB, i

      integer, dimension(left    :middle) :: orderA
      integer, dimension(middle+1:right ) :: orderB

      ! copy order
      orderA = order(left    :middle)
      orderB = order(middle+1:right)

      ! more explicit variables
      leftA  = left
      rightA = middle
      leftB  = middle+1
      rightB = right

      ! initialize iA, iB to their leftmost position
      iA = leftA
      iB = leftB

      i = leftA

      do while ((iA <= rightA) .and. (iB <= rightB))
         if (A(orderA(iA)) <= A(orderB(iB))) then
            order(i) = orderA(iA)
            iA = iA + 1
         else
            order(i) = orderB(iB)
            iB = iB + 1
         end if

         i = i + 1
      end do

      ! either A or B still have elements, append them to the new order
      do while (iA <= rightA)
         order(i) = orderA(iA)
         iA = iA + 1

         i  = i + 1

      end do
      do while (iB <= rightB)
         order(i) = orderB(iB)
         iB = iB + 1

         i  = i + 1
      end do

   end subroutine I_merge

end module mod_sort

module fbh
   use iso_c_binding
   use mod_sort
   use m_mrgrnk
   use omp_lib
   implicit none

   integer, parameter :: WORKSIZE = 2048 ! up to 2K per thread
   real(kind=c_float), parameter :: min_counts = 20.0

   type, bind(c) :: BayesHistogram
      type(c_ptr) :: edges, centers, widths, heights
      integer(kind=c_int) :: n
   end type BayesHistogram

   ! the only public methods: fast_bayesian_binning_energy_range, fast_bayesian_binning, parallel_bayesian_binning and delete_blocks
   ! all the rest should be private by default
   public :: fast_bayesian_binning_energy_range, fast_bayesian_binning, parallel_bayesian_binning, delete_blocks
   private :: build_blocks, partition, deduplicate, divide_bayesian_binning, conquer_bayesian_binning
   private :: count_between_edges, cumsum, quicksort

contains
   type(c_ptr) function fast_bayesian_binning_energy_range(x, n, emin, emax, resolution) bind(C)
      implicit none

      integer(kind=c_int64_t), intent(in) :: n
      real(kind=c_float), intent(in) :: x(n)
      real(kind=c_float), intent(in) :: emin, emax
      integer(kind=c_int), intent(in), optional :: resolution

      real(kind=c_float), dimension(:), allocatable :: energy
      logical(kind=c_bool), dimension(:), allocatable :: mask
      integer(kind=c_int64_t) :: len

      type(BayesHistogram), pointer :: blocks

      if(n .eq. 0) then
         allocate(blocks)
         blocks = BayesHistogram(c_null_ptr, c_null_ptr, c_null_ptr, c_null_ptr, 0)
         fast_bayesian_binning_energy_range = c_loc(blocks)
         return
      end if

      mask = (x .gt. emin) .and. (x .le. emax)
      energy = pack(x, mask)

      len = size(energy, kind=c_int64_t)
      print *, '[FORTRAN] no. points:', n, 'energy-range samples:', len

      if (len .eq. 0) then
         allocate(blocks)
         blocks = BayesHistogram(c_null_ptr, c_null_ptr, c_null_ptr, c_null_ptr, 0)
         fast_bayesian_binning_energy_range = c_loc(blocks)
         return
      end if

      if(present(resolution)) then
         fast_bayesian_binning_energy_range = parallel_bayesian_binning(energy, len, resolution)
      else
         fast_bayesian_binning_energy_range = parallel_bayesian_binning(energy, len)
      end if

      deallocate(energy)
      deallocate(mask)

   end function fast_bayesian_binning_energy_range

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
            if(cnt_in_range .lt. min_counts) exit
            width = edges(Q+1) - edges(i)
            if (width .le. dt) exit

            fitness = cnt_in_range * log(cnt_in_range / width) - log(wh_in_edge(size(wh_in_edge))) ! BIC
            ! fitness = cnt_in_range * log(cnt_in_range / width) - 2.0 ! AIC
            ! fitness = cnt_in_range * log(cnt_in_range / width) - 2.0 * log(log(wh_in_edge(size(wh_in_edge)))) ! HQIC
            !fitness = cnt_in_range * log(cnt_in_range / width) - log(0.8/0.2) ! Geometric(gamma)

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
      integer, dimension(:), allocatable :: order
      real(kind=c_float) :: extent, dt
      integer :: i, L

      type(BayesHistogram), pointer :: blocks

      ! timing
      real(kind=8) :: t1, t2

      if(n .eq. 0) then
         allocate(blocks)
         blocks = BayesHistogram(c_null_ptr, c_null_ptr, c_null_ptr, c_null_ptr, 0)
         parallel_bayesian_binning = c_loc(blocks)
         return
      end if

      ! start the timer
      t1 = omp_get_wtime()

      ! sort the data in parallel
      allocate(order(size(x)))
      !call parallel_sort(x, order)

      ! sort the data
      ! call quicksort(x, 1, size(x))

      !$OMP PARALLEL
      !$OMP SINGLE
      !call quicksort_parallel(x, 1, size(x))
      call quicksort_omp(x, 1, size(x))
      !$OMP END SINGLE
      !$OMP END PARALLEL

      ! set the order array to 1, 2, ..., size(x)
      order = [(i, i=1,size(x))]

      ! end the timer
      t2 = omp_get_wtime()

      print *, '[FORTRAN] sorting time (s):', t2 - t1

      ! start the timer
      t1 = omp_get_wtime()

      allocate(unique(size(x)))
      allocate(weights(size(x)))

      L = 1
      unique(1) = x(order(1))
      weights(1) = 1

      do i = 2, size(x)
         if(x(order(i)) .eq. x(order(i-1))) then
            weights(L) = weights(L) + 1
         else
            L = L + 1
            unique(L) = x(order(i))
            weights(L) = 1
         end if
      end do

      deallocate(order)

      ! truncate the outputs
      unique = unique(1:L)
      weights = weights(1:L)

      ! print the first and last unique samples
      !print *, 'unique:', unique(1), unique(L)

      extent = unique(L) - unique(1)

      if(present(resolution)) then
         dt = abs(extent / resolution)
      else
         dt = 0.0 ! by default the resolution is infinite
      end if

      print *, '[FORTRAN] no. points:', n, 'unique samples:', L, 'dt:', dt

      print *, '[FORTRAN] omp max threads:', omp_get_max_threads()
      change_points = divide_bayesian_binning(unique, weights, dt)

      ! in-place sort the change_points
      call quicksort(change_points, 1, size(change_points))

      ! remove duplicates
      change_points = deduplicate(change_points)

      ! prepend the first element and append the last element
      !change_points = [unique(1), change_points, unique(L)]
      !print *, '[FORTRAN] change_points:', change_points, 'length:', size(change_points)

      ! a placeholder for the time being
      allocate(blocks)
      blocks => build_blocks(unique, change_points, weights)
      parallel_bayesian_binning = c_loc(blocks)

      ! end the timer
      t2 = omp_get_wtime()

      print *, '[FORTRAN] binning time (s):', t2 - t1
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
      deallocate(counts)

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

   function deduplicate(x) result (unique)
      real(kind=c_float), dimension(:), intent(in) :: x
      real(kind=c_float), dimension(:), allocatable :: unique
      integer :: i, tail

      allocate(unique(size(x)))

      tail = 1
      unique(1) = x(1)

      do i = 2, size(x)
         if(x(i) .eq. x(i-1)) then
            ! do nothing
         else
            tail = tail + 1
            unique(tail) = x(i)
         end if
      end do

      ! truncate the outputs
      unique = unique(1:tail)
   end function deduplicate

   recursive function divide_bayesian_binning(unique, weights, dt) result(change_points)
      real(kind=c_float), dimension(:), intent(in) :: unique
      real(kind=c_float), dimension(:), intent(inout) :: weights
      real(kind=c_float), intent(in) :: dt
      real(kind=c_float), dimension(:), allocatable :: change_points, thread_change_points

      integer :: L, mid

      L = size(unique)

      ! check the length of the input
      if(L .gt. WORKSIZE) then
         ! split the data into two overlapping halves, launch two OpenMP tasks and merge the results
         mid = L / 2
         !print *, '[FORTRAN] splitting the data into two halves@', mid

         ! the middle point will be counted twice, halve its weight
         weights(mid) = weights(mid) / 2

         !$omp parallel shared(change_points, unique, weights) private(thread_change_points)
         !$omp single
         !$omp task
         thread_change_points = divide_bayesian_binning(unique(1:mid), weights(1:mid), dt)

         !$omp critical
         if(.not. allocated(change_points)) then
            change_points = thread_change_points
         else
            change_points = (/change_points, thread_change_points/)
         end if
         !$omp end critical
         !$omp end task

         !$omp task
         ! there is a deliberate overlap between the two halves
         thread_change_points = divide_bayesian_binning(unique(mid:L), weights(mid:L), dt)

         !$omp critical
         if(.not. allocated(change_points)) then
            change_points = thread_change_points
         else
            change_points = (/change_points, thread_change_points/)
         end if
         !$omp end critical
         !$omp end task

         !$omp end single
         !$omp end parallel

         !print *, '[FORTRAN] merging the results@', mid
         ! restore the weight of the middle point
         weights(mid) = weights(mid) * 2
      else
         ! base case: the input is small enough
         !print *, '[FORTRAN] base case:', L

         change_points = conquer_bayesian_binning(unique, weights, dt)
      end if

   end function divide_bayesian_binning

   function conquer_bayesian_binning(unique, weights, dt) result(change_points)
      real(kind=c_float), dimension(:), intent(in) :: unique, weights
      real(kind=c_float), intent(in) :: dt

      real(kind=c_float), dimension(:), allocatable :: edges, change_points
      real(kind=c_float), dimension(:), pointer :: wh_in_edge
      real(kind=c_float), dimension(:), allocatable :: best
      integer, dimension(:), allocatable :: best_idx
      real(kind=c_float) :: width, fit_max, cnt_in_range, fitness
      integer :: i, Q, L, i_max

      L = size(unique)

      ! auto-allocate and fill-in the edges
      edges = (/unique(1), 0.5 * (unique(1:L-1) + unique(2:L)), unique(L)/)

      wh_in_edge => count_between_edges(unique, edges, weights, 1)
      call cumsum(wh_in_edge)

      allocate(best(L), best_idx(L))

      do Q = 1, L
         fit_max = -1.0e38 ! -Inf
         i_max = 0

         do i = 1,Q
            cnt_in_range = wh_in_edge(Q+1) - wh_in_edge(i)
            if(cnt_in_range .lt. min_counts) exit
            width = edges(Q+1) - edges(i)
            if (width .le. dt) exit

            fitness = cnt_in_range * log(cnt_in_range / width) - log(wh_in_edge(size(wh_in_edge))) ! BIC
            ! fitness = cnt_in_range * log(cnt_in_range / width) - 2.0 ! AIC
            ! fitness = cnt_in_range * log(cnt_in_range / width) - 2.0 * log(log(wh_in_edge(size(wh_in_edge)))) ! HQIC
            !fitness = cnt_in_range * log(cnt_in_range / width) - log(0.8/0.2) ! Geometric(gamma)

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

      ! finally skip the first item
      !change_points = change_points(2:L+1)
   end function conquer_bayesian_binning

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

   recursive subroutine quicksort_omp(a, first, last)
      implicit none
      real(kind=c_float), intent(inout) :: a(*)
      integer, intent(in) :: first, last

      real(kind=c_float) :: x, t
      integer:: i, j

      ! switch to a sequential sort for small arrays
      if (last - first + 1 .le. WORKSIZE) then
         call quicksort(a, first, last)
         return
      end if

      ! print *, '[FORTRAN] quicksort_omp:', first, last, 'size:', last - first + 1

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

      !$OMP TASK SHARED(a, first, last, i, j)
      if (first < i-1) call quicksort_omp(a, first, i-1)
      !$OMP END TASK

      !$OMP TASK SHARED(a, first, last, i, j)
      if (j+1 < last)  call quicksort_omp(a, j+1, last)
      !$OMP END TASK

      !$OMP TASKWAIT ! Wait for the two sub-tasks to complete
   end subroutine quicksort_omp
end module fbh
