#pragma once

#include <stdint.h>

#define FITS_CHUNK_LENGTH 2880
#define FITS_LINE_LENGTH 80

int read_sxs_events(const char *filename, int16_t **x, int16_t **y, float **energy);