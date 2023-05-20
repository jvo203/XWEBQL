#include <stdlib.h>
#include <stdio.h>
#include <stdbool.h>
#include <string.h>

#include <sys/types.h>
#include <sys/stat.h>
#include <unistd.h>

#include <fcntl.h>
#include <sys/mman.h>

#include "sxs.h"

int hdr_get_int_value(char *hdr)
{
    // printf("VALUE(%s)\n", hdr);
    return atoi(hdr);
};

char *hdr_get_string_value(char *hdr)
{
    char string[FITS_LINE_LENGTH] = "";

    // printf("VALUE(%s)\n", hdr);

    sscanf(hdr, "'%s'", string);

    if (string[strlen(string) - 1] == '\'')
        string[strlen(string) - 1] = '\0';

    return strdup(string);
};

int get_type_size(char *type)
{
    int len = strlen(type);

    if (len == 0)
        return 0;

    char last = type[len - 1];

    // zero-out the last character
    type[len - 1] = '\0';

    // get the number of units (bits or bytes)
    int num = atoi(type);

    // logical (Boolean)
    if (last == 'L')
        return MAX(1, num);

    // bit array (rounded to the nearest byte)
    if (last == 'X')
        return MAX(1, (num + 7) / 8);

    // Unsigned byte
    if (last == 'B')
        return MAX(1, num);

    // 16-bit integer
    if (last == 'I')
        return 2 * MAX(1, num);

    // 32-bit integer
    if (last == 'J')
        return 4 * MAX(1, num);

    // 64-bit integer
    if (last == 'K')
        return 8 * MAX(1, num);

    // character
    if (last == 'A')
        return MAX(1, num);

    // single-precision float (32-bit)
    if (last == 'E')
        return 4 * MAX(1, num);

    // double-precision float (64-bit)
    if (last == 'D')
        return 8 * MAX(1, num);

    // single-precision complex
    if (last == 'C')
        return 8 * MAX(1, num);

    // double-precision complex
    if (last == 'M')
        return 16 * MAX(1, num);

    printf("get_type_size() failed.\n");
    return 0;
}

bool has_table_extension(const char *sxs)
{
    // only scan the beginning of the header
    if (strncmp(sxs, "XTENSION= 'BINTABLE'", 20) == 0)
        return true;
    else
        return false;
}

bool scan_table_header(const char *sxs, int *naxis1, int *naxis2, int *tfields, int *posx, int *posy, int *posupi, int **columns)
{
    // process the header one line at a time
    for (size_t offset = 0; offset < FITS_CHUNK_LENGTH; offset += FITS_LINE_LENGTH)
    {
        char *line = (char *)sxs + offset;

        if (strncmp(line, "END       ", 10) == 0)
        {
            printf("FITS HEADER END DETECTED.\n");
            return true;
        };

        if (strncmp(line, "NAXIS1  = ", 10) == 0)
            *naxis1 = hdr_get_int_value(line + 10);

        if (strncmp(line, "NAXIS2  = ", 10) == 0)
            *naxis2 = hdr_get_int_value(line + 10);

        if (strncmp(line, "TFIELDS = ", 10) == 0)
        {
            *tfields = hdr_get_int_value(line + 10);

            // allocate memory for the column sizes
            *columns = (int *)malloc(*tfields * sizeof(int));
        }

        // detect the TTYPEXX lines
        if (strncmp(line, "TTYPE", 5) == 0)
        {
            int index;
            int status = sscanf(line, "TTYPE%d", &index);

            if (status == 1)
            {
                char *name = hdr_get_string_value(line + 10);

                if (name != NULL)
                {
                    // check if the name is "X", "Y" or "UPI"
                    if (strcmp(name, "X") == 0)
                        *posx = index;
                    else if (strcmp(name, "Y") == 0)
                        *posy = index;
                    else if (strcmp(name, "UPI") == 0)
                        *posupi = index;

                    free(name);
                }
            }
        }

        // detect the TFORMXX lines
        if (strncmp(line, "TFORM", 5) == 0)
        {
            int index;
            int status = sscanf(line, "TFORM%d", &index);

            if (status == 1)
            {
                char *type = hdr_get_string_value(line + 10);

                if (type != NULL)
                {
                    int size = get_type_size(type);

                    // store the size of the column
                    if (*columns != NULL && index > 0 && index <= *tfields)
                        (*columns)[index - 1] = size;

                    free(type);
                }
            }
        }
    }

    return false;
}

int get_column_offset(int *columns, int index)
{
    int offset = 0;

    for (int i = 0; i < index; i++)
        offset += columns[i];

    return offset;
}

int read_sxs_events(const char *filename, int16_t **x, int16_t **y, float **energy)
{
    int *column_sizes = NULL;
    int16_t *x_ptr = NULL;
    int16_t *y_ptr = NULL;
    float *energy_ptr = NULL;

    int num_events = 0;
    size_t filesize = 0;

    // stat the file to get its size
    struct stat st;

    int status = stat(filename, &st);

    if (status != 0)
    {
        printf("stat64() failed.\n");
        return -1;
    }

    filesize = st.st_size;

    // check if the filesize is greater than 2880
    if (filesize < FITS_CHUNK_LENGTH)
    {
        printf("filesize is less than %d.\n", FITS_CHUNK_LENGTH);
        return -1;
    }

    // open the file
    int fd = open(filename, O_RDONLY);

    if (fd == -1)
    {
        printf("open() failed.\n");
        return -1;
    }

    // mmap and close the file
    void *sxs = mmap(NULL, filesize, PROT_READ, MAP_PRIVATE, fd, 0);
    close(fd);

    if (sxs == MAP_FAILED)
    {
        perror("mmap() failed:");
        return -1;
    }

    char *sxs_char = (char *)sxs;
    size_t sxs_offset = 0;
    int hdu = 0;
    bool has_table = false;

    // printf the first 2880 characters
    // printf("sxs_char = %.2880s\n", sxs_char);

    // first find the binary table extension
    while (sxs_offset + FITS_CHUNK_LENGTH <= filesize)
    {
        if (has_table_extension(sxs_char + sxs_offset))
        {
            printf("found a binary table extension in hdu #%d\n", hdu);
            has_table = true;
            break;
        }

        sxs_offset += FITS_CHUNK_LENGTH;
        hdu++;
    }

    if (!has_table)
    {
        printf("no table extension found.\n");
        goto cleanup;
    }

    // we've got the table extension, now find the number of rows/columns
    int NAXIS1 = 0;
    int NAXIS2 = 0;
    int TFIELDS = 0;

    int posx = 0;
    int posy = 0;
    int posupi = 0;

    while (sxs_offset + FITS_CHUNK_LENGTH <= filesize)
    {
        if (scan_table_header(sxs_char + sxs_offset, &NAXIS1, &NAXIS2, &TFIELDS, &posx, &posy, &posupi, &column_sizes))
        {
            printf("table header ends in hdu #%d\n", hdu);
            break;
        }

        sxs_offset += FITS_CHUNK_LENGTH;
        hdu++;
    }

    // point to the start of the data
    sxs_offset += FITS_CHUNK_LENGTH;

    printf("NAXIS1 = %d, NAXIS2 = %d, TFIELDS = %d\n", NAXIS1, NAXIS2, TFIELDS);
    printf("posx = %d, posy = %d, posupi = %d\n", posx, posy, posupi);

    // sum the column sizes
    int i;
    int sum = 0;

    for (i = 0; i < TFIELDS; i++)
        sum += column_sizes[i];

    if (sum != NAXIS1)
    {
        printf("error: bytes_per_row != NAXIS1\n");
        goto cleanup;
    }

    // check if there is enough data in the file
    if (sxs_offset + (size_t)NAXIS2 * (size_t)NAXIS1 > filesize)
    {
        printf("not enough data in the file.\n");
        goto cleanup;
    }

    // allocate the arrays
    x_ptr = (int16_t *)malloc(NAXIS2 * sizeof(int16_t));
    y_ptr = (int16_t *)malloc(NAXIS2 * sizeof(int16_t));
    energy_ptr = (float *)malloc(NAXIS2 * sizeof(float));

    if (x_ptr == NULL || y_ptr == NULL || energy_ptr == NULL)
    {
        free(x_ptr);
        free(y_ptr);
        free(energy_ptr);

        printf("malloc() failed.\n");
        goto cleanup;
    }

    int x_offset = get_column_offset(column_sizes, posx - 1);
    int y_offset = get_column_offset(column_sizes, posy - 1);
    int upi_offset = get_column_offset(column_sizes, posupi - 1);

    printf("x_offset = %d, y_offset = %d, upi_offset = %d\n", x_offset, y_offset, upi_offset);

    // get the data, swapping endianness

#pragma omp parallel for
    for (i = 0; i < NAXIS2; i++)
    {
        int_float tmp;

        x_ptr[i] = __builtin_bswap16(*(int16_t *)(sxs_char + sxs_offset + x_offset /*+ i * NAXIS1*/));
        y_ptr[i] = __builtin_bswap16(*(int16_t *)(sxs_char + sxs_offset + y_offset /*+ i * NAXIS1*/));
        tmp.i = __builtin_bswap32(*(int32_t *)(sxs_char + sxs_offset + upi_offset /*+ i * NAXIS1*/));
        energy_ptr[i] = tmp.f;
        // energy_ptr[i] = *(float *)&tmp; // this breaks aliasing rules
        // memcpy(&energy_ptr[i], &tmp, sizeof(float)); // this does not break aliasing
        sxs_offset += NAXIS1;
    }

    // set the result pointers
    *x = x_ptr;
    *y = y_ptr;
    *energy = energy_ptr;
    num_events = NAXIS2;

cleanup:
    free(column_sizes);

    // munmap the file
    status = munmap(sxs, filesize);

    if (status != 0)
    {
        printf("munmap() failed.\n");
    }

    return num_events;
}