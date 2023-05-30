using ArgParse
using Distributed
using HTTP
using WebSockets


function parse_commandline()
    s = ArgParseSettings()

    @add_arg_table s begin
        "--config"
        help = "a configuration file."
        default = "config.ini"
        "--port"
        help = "an HTTP listening port, defaults to 8080. WebSockets will use the next port (i.e. 8081). The port can also be specified in the .ini config file. Any config file will override this command-line argument."
        arg_type = Int
        default = 8080
    end

    return parse_args(s)
end

# parse command-line arguments (a config file, port numbers etc.)
parsed_args = parse_commandline()

const VERSION_MAJOR = 1
const VERSION_MINOR = 0
const VERSION_SUB = 0
const SERVER_STRING =
    "XWEBQL v" *
    string(VERSION_MAJOR) *
    "." *
    string(VERSION_MINOR) *
    "." *
    string(VERSION_SUB)

const VERSION_STRING = "J/SV2023-06-XX.X-ALPHA"

const FITS_CHUNK = 2880

# default config file
CONFIG_FILE = "config.ini"

const HT_DOCS = "htdocs"
HTTP_PORT = 8080
WS_PORT = HTTP_PORT + 1

include("xevent.jl")

# a global list of FITS objects
XOBJECTS = Dict{String,XDataSet}()
XLOCK = ReentrantLock()