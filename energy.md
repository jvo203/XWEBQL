To calculate the mean value of a third variable (like energy) across 2D bins instead of just raw counts, you need what is known as a 2D Profile Histogram or a Binned Statistic. [1, 2] 
Because you are working with already discrete integer indices, you can achieve this efficiently in Julia using a two-step histogram division or a fast array-based reduction. [1] 
## Option 1: The Histogram Division Trick (Using FHist.jl)
The math rule for a mean inside any given bin is:
$$\text{Mean Energy} = \frac{\sum \text{Energy in bin}}{\text{Count of entries in bin}}$$ 
You can calculate this with FHist.jl by dividing a weighted histogram (using energy as the weights) by an unweighted histogram. [1] 

using FHist

# Sample data with integer coordinates and energy values
x = rand(1:10, 1000)
y = rand(1:10, 1000)
energy = rand(10.0:0.1:100.0, 1000)

# Define matching bin edges for your integer ranges
# Note: Bin edges must cover the values (e.g., 1 to 11 for integer points 1 to 10)
edges = (1:11, 1:11)

# 1. Total energy per pixel (Weighted)
h_sum = Hist2D((x, y), edges, weights=energy)

# 2. Count per pixel (Unweighted)
h_count = Hist2D((x, y), edges)

# 3. Element-wise division yields the mean energy per bin
# (Use FHist's underlying counts matrix, handling 0/0 if necessary)
mean_energy_matrix = h_sum.counts ./ h_count.counts

## Option 2: Pure Julia Matrix Accumulation (Ultra Fast for Dense Integers)
Because your coordinates are already integers, you can bypass formal binning libraries altogether and use base Julia matrices to aggregate the sum and count directly. This is highly optimized and memory efficient. [3] 

function binned_mean_2d(x, y, energy)
    max_x, max_y = maximum(x), maximum(y)
    
    # Pre-allocate accumulators for sum and counts
    energy_sum = zeros(Float64, max_x, max_y)
    counts     = zeros(Int64, max_x, max_y)
    
    # Single-pass loop to fill matrices
    for i in eachindex(x)
        xi, yi = x[i], y[i]
        energy_sum[xi, yi] += energy[i]
        counts[xi, yi]     += 1
    end
    
    # Compute mean, replacing 0 counts with NaN to avoid 0/0 division
    mean_energy = energy_sum ./ max.(counts, 1)
    mean_energy[counts .== 0] .= NaN 
    
    return mean_energy
end

mean_matrix = binned_mean_2d(x, y, energy)

If your integer indices include negative numbers or are highly sparse (e.g., large empty gaps between coordinates), let me know so I can adjust the code to map them safely using a Dictionary or coordinate offsets.

[1] [https://discourse.julialang.org](https://discourse.julialang.org/t/a-histogram-that-averages-metadata-instead-of-counts/45257)
[2] [https://cds.cern.ch](https://cds.cern.ch/record/2296392/files/paw.pdf)
[3] [https://www.jlhub.com](https://www.jlhub.com/julia/manual/en/function/hist2d-exclamation)

