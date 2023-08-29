# 1. Open up the Ports via a Firewall

    https://mebee.info/2019/10/17/post-2369/

    # 8000 is used by Python to serve a demo page
    sudo firewall-cmd --add-port={8000,10000,10001}/tcp --zone=public --permanent
    sudo firewall-cmd --reload

# 2. Julia packages
    
    ArgParse CodecBzip2 CodecLz4 ConfParser HTTP JSON SQLite WebSockets x265_jll