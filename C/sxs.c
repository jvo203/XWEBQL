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

bool has_table_extension(const char *sxs)
{
    // only scan the beginning of the header
    if (strncmp(sxs, "XTENSION= 'BINTABLE'", 20) == 0)
        return true;
    else
        return false;
}

bool scan_table_header(const char *sxs, int *naxis1, int *naxis2, int *tfields)
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
            *tfields = hdr_get_int_value(line + 10);

        // detect the TTYPEXX lines
        if (strncmp(line, "TTYPE", 5) == 0)
        {
            int index;
            char *name = NULL;

            printf("%.80s\n", line);
            int status = sscanf(line, "TTYPE%d", &index);

            if (status == 1)
            {
                printf("TTYPE%d = %.8s\n", index, line + 10);
            }
        }

        // detect the TFORMXX lines
        if (strncmp(line, "TFORM", 5) == 0)
        {
            printf("TFORM = %.8s\n", line + 10);
        }
    }

    return false;
}

int read_sxs_events(const char *filename, int16_t **x, int16_t **y, float **energy)
{
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
    bool had_table = false;

    // printf the first 2880 characters
    // printf("sxs_char = %.2880s\n", sxs_char);

    // first find the binary table extension
    while (sxs_offset + FITS_CHUNK_LENGTH <= filesize)
    {
        if (has_table_extension(sxs_char + sxs_offset))
        {
            printf("found a binary table extension in hdu #%d\n", hdu);
            had_table = true;
            break;
        }

        sxs_offset += FITS_CHUNK_LENGTH;
        hdu++;
    }

    if (!had_table)
    {
        printf("no table extension found.\n");
        goto cleanup;
    }

    // we've got the table extension, now find the number of rows/columns
    int NAXIS1 = 0;
    int NAXIS2 = 0;
    int TFIELDS = 0;

    while (sxs_offset + FITS_CHUNK_LENGTH <= filesize)
    {
        if (scan_table_header(sxs_char + sxs_offset, &NAXIS1, &NAXIS2, &TFIELDS))
        {
            printf("table header ends in hdu #%d\n", hdu);
            break;
        }

        sxs_offset += FITS_CHUNK_LENGTH;
        hdu++;
    }

    printf("NAXIS1 = %d, NAXIS2 = %d, TFIELDS = %d\n", NAXIS1, NAXIS2, TFIELDS);

    // allocate the arrays
    x_ptr = (int16_t *)malloc(NAXIS2 * sizeof(int16_t));
    y_ptr = (int16_t *)malloc(NAXIS2 * sizeof(int16_t));
    energy_ptr = (float *)malloc(NAXIS2 * sizeof(float));

    // point to the start of the data
    sxs_offset += FITS_CHUNK_LENGTH;

    // set the result pointers
    *x = x_ptr;
    *y = y_ptr;
    *energy = energy_ptr;
    num_events = NAXIS2;

cleanup:
    // munmap the file
    status = munmap(sxs, filesize);

    if (status != 0)
    {
        printf("munmap() failed.\n");
    }

    return num_events;
}