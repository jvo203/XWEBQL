include("fortran_toolchain.jl")

# read the code from a file
code = open(f -> read(f, String), "../Fortran/fbh.f90")

# compile the SPMD code
lib = load_fortran(code, `-mcmodel=small -Ofast -fopenmp -ftree-vectorize -ftree-vectorizer-verbose=1 -funroll-loops -fmax-stack-var-size=32768`)

# get function pointers
const fast_bayesian_binning_fptr = Libc.Libdl.dlsym(lib, "fast_bayesian_binning")
const delete_blocks_fptr = Libc.Libdl.dlsym(lib, "delete_blocks")
