#pragma once

#include <stdint.h>

int read_sxs_events(const char *filename, int16_t **x, int16_t **y, float **energy);