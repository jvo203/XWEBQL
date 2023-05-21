.DEFAULT_GOAL := sxs

# get the Homebrew installation directory
# brew --prefix is not available from inside the Homebrew environment
HOMEBREW_PREFIX := $(shell brew --prefix)

# assume Intel macOS	
ifeq ($(HOMEBREW_PREFIX),)
	HOMEBREW_PREFIX := $(shell /usr/local/bin/brew --prefix)
endif

# if it still cannot be found assume Apple Silicon macOS
ifeq ($(HOMEBREW_PREFIX),)
	HOMEBREW_PREFIX := $(shell /opt/homebrew/bin/brew --prefix)
endif

# the stack should be unlimited to avoid problems
# with ifort creating on the stack large temporary arrays
# ulimit -s unlimited

# detect the OS
UNAME_S := $(shell uname -s)

# detect NVIDIA HPC SDK
NVFORTRAN := $(shell command -v nvfortran -v 2> /dev/null)
NVC := $(shell command -v nvc -v 2> /dev/null)

# detect the CPU architecture (ARM64 or x86-64)
UNAME_M := $(shell uname -m)
# UNAME_M := $(shell sh -c 'uname -m 2>/dev/null || echo not')

# the macOS Darwin target is handled further down the line
ifeq ($(UNAME_S),Linux)

	# detect the CPU vendor
	CPU_S := $(shell cat /proc/cpuinfo)	
#CPU_S := AuthenticAMD

	# detect OS version
	OS_S := $(shell cat /proc/version)

	# default settings on Linux
	ifeq ($(UNAME_S),Linux)

		# found an AMD CPU
		ifneq (,$(findstring AuthenticAMD,$(CPU_S)))
			# GNU gcc / gfortran
			CC := gcc
			FORT := gfortran
		endif

		# found an Intel CPU
		ifneq (,$(findstring GenuineIntel,$(CPU_S)))
			ifneq (,$(findstring Clear,$(OS_S)))
				# GNU gcc / gfortran since there are problems with ifort on Intel Clear Linux
				CC := gcc
				FORT := gfortran
			else
				# Intel oneAPI icc/ifort or icx/ifx (fixed_array.f90 does not compile with ifx)
				CC := icc
				FORT := ifort

				# not so fast, the icc / ifort combo is buggy (unstable?) !!! an answer :> recursive I/O seg. faults
				CC := gcc
				FORT := gfortran
			endif
		endif

		#ifndef NVFORTRAN
		#	# GNU gcc / gfortran
		#	CC := gcc
		#	FORT := gfortran
		#else
		#	# NVIDIA C / Fortran
		#	CC := nvc
		#	FORT := nvfortran
		#endif

	endif

endif

JEMALLOC = `pkg-config --libs jemalloc` -L`jemalloc-config --libdir` -Wl,-rpath,`jemalloc-config --libdir` -ljemalloc `jemalloc-config --libs`
TCMALLOC = -ltcmalloc
TARGET = test_sxs

# Intel Integrated Performance Primitives Library
ifeq ($(UNAME_S),Linux)
	OS = linux
    IPP = -L${IPPROOT}/lib/intel64
	# -L${IPPROOT}/lib/intel64/tl/openmp
	MKL =  ${MKLROOT}/lib/intel64/libmkl_lapack95_lp64.a -L${MKLROOT}/lib/intel64
endif

ifeq ($(UNAME_S),Darwin)
	OS = macOS
    IPP = -L${IPPROOT}/lib
	# -L${IPPROOT}/lib/tl/openmp
	MKL =  ${MKLROOT}/lib/libmkl_lapack95_lp64.a -L${MKLROOT}/lib -Wl,-rpath,${MKLROOT}/lib
endif

IPP += -lippi -lippdc -lipps -lippcore
# -lippcore_tl_omp -lippi_tl_omp
MKL += -lmkl_intel_lp64 -lmkl_sequential -lmkl_core -lpthread -lm -ldl
# -liomp5

SRC = sxs.c test_sxs.c

# macOS Accelerate vImage is actually rather slow
ifeq ($(UNAME_S),Darwin)
	#SRC += src/vimage.c
else
	#SRC += src/ipp.c
endif

OBJ := $(SRC:.f90=.o)
OBJ := $(OBJ:.c=.o)
OBJ := $(OBJ:.ispc=.o)
DEP = $(OBJ:%.o=%.d)

ifeq ($(CC),icc)
	FLAGS = -g -Ofast -xHost -mavx -axAVX -qopt-report=2 -qopenmp -mcmodel=large -shared-intel
# -parallel
#-mcmodel=medium
#-ipo -parallel -fast
# -ipo causes segmentation faults ...
# -fast causes static linking problems

	CFLAGS := $(FLAGS)
	FLAGS += -heap-arrays 32 -align array64byte -fpp -D__$(OS)__
	# -stand f18
#-mt_mpi
endif

# `pkg-config --cflags libavif` `pkg-config --cflags libjpeg`
# INC = `pkg-config --cflags glib-2.0` `pkg-config --cflags libmicrohttpd` `pkg-config --cflags libcurl` `pkg-config --cflags liblz4` `pkg-config --cflags cfitsio` `pkg-config --cflags x265` `pkg-config --cflags jemalloc` `pkg-config --cflags libczmq` `pkg-config --cflags libpq` -I./$(ZFP)/include -I./$(ZFP)/src 
INC = 

ifneq ($(UNAME_S),Darwin)
	# INC += `pkg-config --cflags libcpuid`
endif

ifneq ($(UNAME_S),Darwin)
#ifneq ($(UNAME_M),arm64)
	INC += -I${MKLROOT}/include/intel64/lp64 -I${MKLROOT}/include
endif

MOD =
# -I/home/chris/zfp/include
DEF = -DNODEBUG -DNO_MONGOOSE_HTTP_CLIENT -DMG_DATA_SIZE=50 -DHAVE_ZLIB

ifneq ($(SHARE),)
	DEF += -DSHARE='"$(SHARE)"'
endif

# `pkg-config --libs libavif` `pkg-config --libs libjpeg`
# LIBS = -L/usr/local/lib `pkg-config --libs glib-2.0` `pkg-config --libs libmicrohttpd` `pkg-config --libs liblz4` `pkg-config --libs cfitsio` -lsqlite3 `pkg-config --libs libcurl` -lz -lbz2 -pthread `pkg-config --libs libzmq` `pkg-config --libs libczmq` `pkg-config --libs x265` `pkg-config --libs libpq`
LIBS = 

ifneq ($(UNAME_S),Darwin)
	# LIBS += `pkg-config --libs libcpuid`
endif

# -lzfp before cfitsio
#`pkg-config --libs json-fortran`

# -lmpifort not needed when using mpiifort
# -L/home/chris/zfp/build/lib64

ifeq ($(CC),icc)
	# Intel FORTRAN runtime
	LIBS += -lifcore -limf
endif

ifeq ($(UNAME_S),Darwin)
	# INC += -I/usr/local/include -I/usr/local/opt/openssl/include -I/usr/local/opt/curl/include
	# LIBS += -L/usr/local/opt/openssl/lib -L/usr/local/opt/curl/lib -lcurl
	#MOD += `pkg-config --cflags json-fortran`

	# INC += -I${HOMEBREW_PREFIX}/opt/libpq/include -I${HOMEBREW_PREFIX}/opt/bzip2/include
	# LIBS += -L${HOMEBREW_PREFIX}/opt/libpq/lib -L${HOMEBREW_PREFIX}/opt/bzip2/lib

	CC = ${HOMEBREW_PREFIX}/opt/gcc/bin/gcc-13
	FORT = ${HOMEBREW_PREFIX}/opt/gcc/bin/gfortran-13
	FLAGS = -march=native -Ofast -flto -fPIC -fno-finite-math-only -funroll-loops -ftree-vectorize -fopenmp
	# -mcmodel=large results in "error: invalid variant 'BLEAH'"
	# Apple Silicon: -march=native conflicts between macOS-arm64 and macOS-x86_64 with Intel oneAPI
	CFLAGS := $(FLAGS) -flax-vector-conversions
	FLAGS := $(FLAGS) -std=f2018 -fall-intrinsics

	# GCC FORTRAN runtime
	LIBS += -L${HOMEBREW_PREFIX}/opt/gcc/lib/gcc/13 -lgfortran -lm -framework Accelerate

	# use the built-in macOS Accelerate instead but only on Apple Silicon (OK, Intel macOS too)
	#ifeq ($(UNAME_M),arm64)
	IPP =
	MKL =
	#endif

	# try clang for a change; force the use of libgomp instead of libomp (FORTRAN has been compiled with gfortran, flang is immature at the moment)
	CC = ${HOMEBREW_PREFIX}/opt/llvm/bin/clang
	CFLAGS := -Xpreprocessor -Ofast -flto -fopenmp=libgomp -fno-finite-math-only -Wno-register -funroll-loops -ftree-vectorize -Rpass=loop-vectorize -flax-vector-conversions -Wl,-no_compact_unwind -Wno-unused-command-line-argument
	## INC += -I${HOMEBREW_PREFIX}/opt/libomp/include
	## LIBS += -L${HOMEBREW_PREFIX}/opt/llvm/lib -lomp	

	# CC = zig cc
	# CFLAGS := -Xpreprocessor -Ofast -flto -fopenmp=libgomp -fno-finite-math-only -Wno-register -funroll-loops -ftree-vectorize -Rpass=loop-vectorize -flax-vector-conversions -Wl,-no_compact_unwind -Wno-unused-command-line-argument
	# LIBS += -lgomp
	## INC += -I${HOMEBREW_PREFIX}/opt/libomp/include
	## LIBS += -L${HOMEBREW_PREFIX}/opt/libomp/lib -lomp	

	# try Intel compilers for a change! ... compilation (mongoose!?) & linking problems ...
	CC = icc
	FORT = ifort
	FLAGS := -Ofast -xHost -mavx -axAVX -qopt-report=2 -qopenmp -mcmodel=large -shared-intel
	CFLAGS := $(FLAGS) -I/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/include
	# icc main.c -isysroot /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk
	FLAGS += -heap-arrays 32 -align array64byte -fpp -D__$(OS)__

	ifeq ($(FORT),nagfor)
		MPI_LINK_FLAGS = $(shell mpifort --showme:link)
		FLAGS := -target=core2 -O4 -f2018 -kind=byte -openmp -colour $(MPI_LINK_FLAGS)
	else
		FLAGS += -cpp -D__$(OS)__ -fallow-invalid-boz -fmax-stack-var-size=32768
	endif
endif

# detect the NVIDIA Compiler under Linux
ifeq ($(CC),nvc)
	CFLAGS = -pg -fast -mp
	FLAGS := $(CFLAGS) -cpp -D__$(OS)__
endif

# detect the GNU Compiler under Linux
ifeq ($(CC),gcc)
	override CFLAGS += -march=native -mcmodel=large -Ofast -flto -fPIC -fno-finite-math-only -funroll-loops -ftree-vectorize -fopenmp -Wall -Wextra
	FLAGS := $(CFLAGS) -std=f2018 -fall-intrinsics

	ifeq ($(FORT),nagfor)
		MPI_LINK_FLAGS = $(shell mpifort --showme:link)
		FLAGS := -target=core2 -O4 -f2018 -kind=byte -openmp -colour $(MPI_LINK_FLAGS)
	else
		FLAGS += -cpp -D__$(OS)__ -fallow-invalid-boz -fmax-stack-var-size=32768
	endif

	# GCC FORTRAN runtime
	LIBS +=  -lgfortran -lm

	# try the zig compiler
	# override CFLAGS = -Ofast -fopenmp=libgomp -fno-finite-math-only -Wno-register -funroll-loops -ftree-vectorize -Rpass=loop-vectorize -flax-vector-conversions
	# CC = zig cc
	# LIBS += -lgomp
endif

# include dependencies (all .d files)
-include $(DEP)

%.o: %.ispc
	ispc -g -O3 --pic --opt=fast-math --addressing=64 -o $@ -h $(subst .o,.h,$@) $<

%.o: %.c
	$(CC) $(CFLAGS) $(DEF) $(INC) -MMD -o $@ -c $<

%.o: %.f90
	$(FORT) $(FLAGS) $(MOD) -o $@ -c $<

sxs: $(OBJ)
	$(CC) $(CFLAGS) -o $(TARGET) $^ $(LIBS) $(IPP) $(MKL) $(JEMALLOC)

clean:
	rm -f *.mod *.o *.d *.optrpt $(TARGET)
