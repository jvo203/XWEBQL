# XWEBQL

X-ray events FITS files Web Quick Look coded mostly in Julia. **Bayesian Blocks** Histogram Binning has been accelerated and made parallel in Fortran (_*divide-and-conquer*_ OpenMP tasks) for a 30x speed-up over a pure Julia [BayesHistogram.jl](https://github.com/francescoalemanno/BayesHistogram.jl) . The Fortran code is compiled to a shared library and called from Julia.

## status: _*BETA*_

## try it online at the Japanese Virtual Observatory (JVO): [HITOMI Demo](http://jvo.nao.ac.jp/portal/xwebql.do)

![Alt text](XWEBQL1.jpg?raw=true "JAXA/JVO X-ray WebQL")

![Alt text](AtomDB.jpg?raw=true "XWEBQL AtomDB integration")

![Alt text](XWEBQL2.jpg?raw=true "JAXA/JVO X-ray WebQL")