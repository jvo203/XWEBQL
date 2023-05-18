#include <stdlib.h>
#include <stdio.h>

#include <sys/types.h>
#include <sys/stat.h>
#include <unistd.h>

#include <fcntl.h>
#include <sys/mman.h>

#include "sxs.h"

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

    // open the file
    int fd = open(filename, O_RDONLY);

    if (fd == -1)
    {
        printf("open() failed.\n");
        return -1;
    }

    // mmap the file
    void *sxs = mmap(NULL, filesize, PROT_READ, MAP_PRIVATE, fd, 0);

    close(fd);

    if (sxs == MAP_FAILED)
    {
        printf("mmap() failed.\n");
        return -1;
    }

    // munmap the file
    status = munmap(sxs, filesize);

    if (status != 0)
    {
        printf("munmap() failed.\n");
    }

    return num_events;
}