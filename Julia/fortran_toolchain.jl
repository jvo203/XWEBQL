# Detect how to link a shared library:
gfortran = strip(read(`which gfortran`, String))
gfortran == "" && error("gfortran is required")

@static if Sys.isapple()
    link(objfile, libfile) = run(`$gfortran -fopenmp -dynamiclib -o "$libfile" "$objfile"`)
end

@static if Sys.islinux()
    link(objfile, libfile) = run(`$gfortran -fopenmp -shared -Wl,-export-dynamic "$objfile" -o "$libfile"`)
end

@static if Sys.iswindows()
    error("Not implemented: don't know how to create a shared lib on Windows")
end

"""
Runs `gfortran` on `code`, creates a shared library and returns a library
handle `lib` for use with `Libdl.dlsym(lib, symbol)`.
"""
function load_fortran(code, options=``)

    function load(tmpdir)
        objfile = "$tmpdir/program.o"
        libfile = "$tmpdir/program.so"

        # Pass the code file to gfortran for compilation:
        fortran_cmd = `$gfortran -c -o "$objfile" -march=native -fPIC $options $code`
        println("Compiling Fortran code with a command: $fortran_cmd")
        run(fortran_cmd)

        # Create a shared library:
        link(objfile, libfile)
        return Libc.Libdl.dlopen(libfile)
    end

    load(mktempdir())
end
