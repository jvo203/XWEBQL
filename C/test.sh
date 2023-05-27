#! /bin/bash

test_loop() {
    # execute a test in loop
    for i in {1..10}
    do    
        ./test_sxs
    done
}

echo ""
echo "Testing Zig"
rm ./test_sxs
make
test_loop
