#include <stdlib.h>
#include <stdio.h>
#include <time.h>

#include "sxs.h"

int main()
{
    // const char *event_filename = "../../../NAO/JAXA/ah100040060sxs_p0px1010_cl.evt"; // HITOMI
    const char *event_filename = "/tmp/xa300018010xtd_p0300000a0_cl.evt"; // XRISM
    // const char *event_filename = "../../../NAO/JAXA/XRISM/xa000129000xtd_p030000010_cl.evt"; // XRISM
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

    // print the first and last values
    printf("x[0] = %d\n", x[0]);
    printf("y[0] = %d\n", y[0]);
    printf("energy[0] = %g\n", energy[0]);

    printf("x[%d] = %d\n", num_events - 1, x[num_events - 1]);
    printf("y[%d] = %d\n", num_events - 1, y[num_events - 1]);
    printf("energy[%d] = %g\n", num_events - 1, energy[num_events - 1]);

    // sum x, y and energy
    /*int64_t x_sum = 0;
    int64_t y_sum = 0;
    double energy_sum = 0.0;

    for (int i = 0; i < num_events; i++)
    {
        x_sum += x[i];
        y_sum += y[i];
        energy_sum += energy[i];
    }

    printf("x_sum = %lld\n", x_sum);
    printf("y_sum = %lld\n", y_sum);
    printf("energy_sum = %g\n", energy_sum);*/

    free(x);
    free(y);
    free(energy);

    return 0;
}
