     float pmin = params.x;
     float pmax = params.y;

     // {x, pmin, pmax} are already in log space
     float pixel = (x - pmin) / (pmax - pmin);
     pixel = clamp(pixel, 0.0, 1.0); // clamp just in case of rounding errors

     // to be glued together with a separate colourmap shader