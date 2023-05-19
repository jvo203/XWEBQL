#include <stdlib.h>
#include <stdio.h>

#include <sys/types.h>
#include <sys/stat.h>
#include <unistd.h>

#include <fcntl.h>
#include <sys/mman.h>

#include <string.h>

#include "sxs.h"

bool has_table_extension(const char *sxs)
{
    // only scan the beginning of the header
    if (strncmp(sxs, "XTENSION= 'BINTABLE'", 20) == 0)
        return true;
    else
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
            printf("found table extension in hdu #%d\n", hdu);
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

    // set the result pointers
    *x = x_ptr;
    *y = y_ptr;
    *energy = energy_ptr;

cleanup:
    // munmap the file
    status = munmap(sxs, filesize);

    if (status != 0)
    {
        printf("munmap() failed.\n");
    }

    return num_events;
}