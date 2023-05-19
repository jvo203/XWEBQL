#pragma once

#include <stdint.h>
#include <stdbool.h>

#define FITS_CHUNK_LENGTH 2880
#define FITS_LINE_LENGTH 80

bool has_table_extension(const char *sxs);
int read_sxs_events(const char *filename, int16_t **x, int16_t **y, float **energy);