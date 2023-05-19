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

bool has_table_extension(const char *sxs)
{
    // only scan the beginning of the header
    if (strncmp(sxs, "XTENSION= 'BINTABLE'", 20) == 0)
        return true;
    else
        return false;
}

bool scan_table_header(const char *sxs, int *naxis1, int *naxis2, int *tfields, int *posx, int *posy, int *posupi)
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

            int status = sscanf(line, "TTYPE%d", &index);

            if (status == 1)
            {
                char *name = hdr_get_string_value(line + 10);

                if (name != NULL)
                {
                    printf("TTYPE%d = '%s'\n", index, name);

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
        if (scan_table_header(sxs_char + sxs_offset, &NAXIS1, &NAXIS2, &TFIELDS, &posx, &posy, &posupi))
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