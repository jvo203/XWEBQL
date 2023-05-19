#include <stdlib.h>
#include <stdio.h>
#include <time.h>

#include "sxs.h"

int main()
{
    const char *event_filename = "../../../NAO/JAXA/ah100040060sxs_p0px1010_cl.evt";
    printf("event_filename = %s\n", event_filename);

    int16_t *x = NULL;
    int16_t *y = NULL;
    float *energy = NULL;
    int num_events = 0;

    clock_t start = clock();

    // open the event file and mmap it
    num_events = read_sxs_events(event_filename, &x, &y, &energy);

    clock_t end = clock();
    double duration = ((double)(end - start)) * 1000.0 / CLOCKS_PER_SEC;
    printf("read_sxs_events() took %f ms\n", duration);

    if (num_events == -1)
    {
        printf("read_sxs_events() failed.\n");
        return 1;
    }

    printf("num_events = %d\n", num_events);

    free(x);
    free(y);
    free(energy);

    return 0;
}