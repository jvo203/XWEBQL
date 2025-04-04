#include <emscripten.h>
#include <emscripten/bind.h>
#include <emscripten/val.h>

extern "C"
{
// HEVC video decoder
#include "hevc_decoder.h"
}

extern "C"
{
// ZFP decoder
#include "zfp.h"
}

static float *pixelBuffer = NULL;
static size_t pixelLength = 0;

#include <iostream>
#include <algorithm>
#include <cstdint>
#include <map>
#include <stdexcept>
#include <string>
#include <vector>

using namespace emscripten;

typedef std::vector<float> Float;
typedef std::vector<unsigned char> UChar;

struct buffer
{
    unsigned int ptr;
    unsigned int size;
};

/*val*/ buffer decompressZFPimage(int img_width, int img_height, std::string const &bytes)
{
    buffer wasmBuffer = {0, 0};

    // std::cout << "[decompressZFPImage] " << bytes.size() << " bytes." << std::endl;

    size_t img_size = size_t(img_width) * size_t(img_height);

    if (pixelBuffer != NULL && pixelLength != img_size)
    {
        free(pixelBuffer);

        pixelBuffer = NULL;
        pixelLength = 0;
    }

    if (pixelBuffer == NULL)
    {
        pixelLength = img_size;
        pixelBuffer = (float *)calloc(pixelLength, sizeof(float));
    }

    if (pixelBuffer == NULL)
    {
        pixelLength = 0;
        // return val(typed_memory_view(pixelLength, pixelBuffer));
        return wasmBuffer;
    }

    // ZFP variables
    zfp_type data_type = zfp_type_float;
    zfp_field *field = NULL;
    zfp_stream *zfp = NULL;
    size_t bufsize = 0;
    bitstream *stream = NULL;
    size_t zfpsize = 0;
    uint nx = img_width;
    uint ny = img_height;

    // decompress pixels with ZFP
    field = zfp_field_2d((void *)pixelBuffer, data_type, nx, ny);

    // allocate metadata for a compressed stream
    zfp = zfp_stream_open(NULL);

    // associate bit stream with allocated buffer
    bufsize = bytes.size();
    stream = stream_open((void *)bytes.data(), bufsize);

    if (stream != NULL)
    {
        zfp_stream_set_bit_stream(zfp, stream);

        zfp_read_header(zfp, field, ZFP_HEADER_FULL);

        // decompress entire array
        zfpsize = zfp_decompress(zfp, field);

        if (zfpsize == 0)
            printf("ZFP decompression failed!\n");
        /*else
          printf("decompressed %zu bytes (image pixels).\n", zfpsize);*/

        stream_close(stream);

        // the decompressed part is available at pixels[0..zfpsize-1] (a.k.a. pixels.data())
    }

    // clean up
    zfp_field_free(field);
    zfp_stream_close(zfp);

    /*for (size_t i = 0; i < pixelLength; i++)
      if (pixelBuffer[i] != 0.0f)
        printf("%zu:%f|", i, pixelBuffer[i]);
    printf("\n");

    printf("pixelLength: %zu, buffer:%p\n", pixelLength, pixelBuffer);*/

    wasmBuffer.ptr = (unsigned int)pixelBuffer;
    wasmBuffer.size = (unsigned int)pixelLength;
    return wasmBuffer;

    // return val(typed_memory_view(pixelLength, pixelBuffer));
    // return val(memory_view<unsigned char>(img_width * img_height * sizeof(float), (unsigned char *)pixelBuffer));

    // another try - create an array in JavaScript
    /*val js_pixels = val::global("Float32Array").new_(pixelLength);
    js_pixels.call<void>("set", val(typed_memory_view((int)pixelLength, (float *)pixelBuffer)));
    return js_pixels;*/
}

void hevc_init_frame(int va_count, int width, int height)
{
    size_t len = width * height * 4;

    if (canvasLength != len)
    {
        if (canvasBuffer != NULL)
            free(canvasBuffer);

        canvasBuffer = NULL;
        canvasLength = 0;
    }

    if (canvasBuffer == NULL)
    {
        canvasBuffer = (unsigned char *)malloc(len);

        if (canvasBuffer != NULL)
        {
            memset(canvasBuffer, 0, len);
            canvasLength = len;
        }

        printf("[hevc_init_frame] width: %d, height: %d, canvasLength = %zu, canvasBuffer = %p\n", width, height, canvasLength, canvasBuffer);
    }

    hevc_init(va_count);

    printf("[hevc_init_frame] done.\n");
}

void hevc_destroy_frame(int va_count)
{
    if (canvasBuffer != NULL)
    {
        free(canvasBuffer);

        canvasBuffer = NULL;
        canvasLength = 0;
    }

    hevc_destroy(va_count);

    printf("[hevc_destroy_frame] done.\n");
}

/*val*/ buffer hevc_decode_frame(unsigned int _w, unsigned int _h, std::string const &bytes, int index, std::string const &colourmap, unsigned char fill, int contours)
{
    buffer wasmBuffer = {0, 0};

    size_t len = _w * _h * 4;

    if (canvasBuffer != NULL && canvasLength == len)
        hevc_decode_nal_unit(index, (unsigned char *)bytes.data(), bytes.size(), canvasBuffer, _w, _h, colourmap.c_str(), fill, contours);
    else
    {
        printf("canvasBuffer(%p) == NULL and/or canvasLength(%zu) does not match len(%zu)\n", canvasBuffer, canvasLength, len);
        hevc_decode_nal_unit(index, (unsigned char *)bytes.data(), bytes.size(), NULL, _w, _h, colourmap.c_str(), fill, 0);
    }

    wasmBuffer.ptr = (unsigned int)canvasBuffer;
    wasmBuffer.size = (unsigned int)canvasLength;
    return wasmBuffer;

    // return val(typed_memory_view(canvasLength, canvasBuffer));
}

EMSCRIPTEN_BINDINGS(Wrapper)
{
    register_vector<float>("Float");
    register_vector<unsigned char>("UChar");
    value_array<buffer>("buffer")
        .element(&buffer::ptr)
        .element(&buffer::size);
    function("decompressZFPimage", &decompressZFPimage);
    function("hevc_init_frame", &hevc_init_frame);
    function("hevc_destroy_frame", &hevc_destroy_frame);
    function("hevc_decode_frame", &hevc_decode_frame);
}