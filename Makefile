.DEFAULT_GOAL := test

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

INC = 
LIBS = 

# detect the OS
UNAME_S := $(shell uname -s)

SRC = fbh

# on macOS use -dynamiclib instead of -shared
# test the OS
ifeq ($(UNAME_S),Linux)	
	SHARED := -shared -Wl,-export-dynamic
	OBJFILE := $(SRC).so
endif

ifeq ($(UNAME_S),Darwin)
	SHARED := -dynamiclib	
	OBJFILE := $(SRC).dylib
endif

for:
	gfortran -march=native $(SHARED) -fPIC -mcmodel=small -Ofast -fopenmp -ftree-vectorize -ftree-vectorizer-verbose=1 -funroll-loops -fmax-stack-var-size=32768 $(INC) -o $(OBJFILE) $(SRC).f90 $(LIBS)

test:
	gfortran -march=native -g -Ofast -fopenmp -ftree-vectorize -ftree-vectorizer-verbose=1 -funroll-loops -fmax-stack-var-size=32768 $(INC) -o test_bl test_bl.f90 $(LIBS)

clean:
	rm -f *.o *.mod *.a *.so test_bl
