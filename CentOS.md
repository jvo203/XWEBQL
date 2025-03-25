# Installing / Running XWEBQL on CentOS
Prerequisites: Julia, git

# 1. Open up the Ports via a Firewall

    https://mebee.info/2019/10/17/post-2369/

    # 8000 is used by Python to serve a demo page
    # HTTP: 10000
    # WebSockets: 10001
    sudo firewall-cmd --add-port={8000,10000,10001}/tcp --zone=public --permanent
    sudo firewall-cmd --reload

# 2. Install Julia packages
    
    ArgParse BayesHistogram CodecBzip2 CodecLz4 CodecZlib CodecZstd ConfParser HTTP JSON SQLite WebSockets x265_jll ZfpCompression FITSIO FHist ImageTransformations Interpolations ThreadsX SortingAlgorithms StaticArrays StructArrays

# 3. Clone XWEBQL

    git clone https://github.com/jvo203/XWEBQL.git
    cd XWEBQL

# 4. Create a config file if necessary
    
    nano -w config.ini

    grid82 example:

    [xwebql]
    port=10000 ; optional
    local=false ; optional
    timeout=15 ; [s], optional (setting 0 disables a timeout)
    home=/ssd/JAXA ; optional
    cache=/ssd/cache ; optional
    logs=/home/chris/LOGS ; optional

# 5. Run the server
        
    julia -O3 Julia/xwebql.jl