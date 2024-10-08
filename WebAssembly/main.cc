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

extern "C"
{
// LZ4 decoder
#include "lz4.h"
}

static float *pixelBuffer = NULL;
static size_t pixelLength = 0;

static unsigned char *alphaBuffer = NULL;
static size_t alphaLength = 0;

static float *spectrumBuffer = NULL;
static size_t spectrumLength = 0;

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

/*val*/ buffer decompressZFPspectrum(int length, std::string const &bytes)
{
    buffer wasmBuffer = {0, 0};

    // std::cout << "[decompressZFP1D] " << bytes.size() << " bytes." << std::endl;

    if (spectrumBuffer != NULL && spectrumLength != length)
    {
        free(spectrumBuffer);

        spectrumBuffer = NULL;
        spectrumLength = 0;
    }

    if (spectrumBuffer == NULL)
    {
        spectrumLength = length;
        spectrumBuffer = (float *)calloc(spectrumLength, sizeof(float));
    }

    if (spectrumBuffer == NULL)
    {
        spectrumLength = 0;
        // return val(typed_memory_view(spectrumLength, spectrumBuffer));
        return wasmBuffer;
    }

    // ZFP variables
    zfp_type data_type = zfp_type_float;
    zfp_field *field = NULL;
    zfp_stream *zfp = NULL;
    size_t bufsize = 0;
    bitstream *stream = NULL;
    size_t zfpsize = 0;
    uint nx = length;

    // decompress spectrum with ZFP
    field = zfp_field_1d((void *)spectrumBuffer, data_type, nx);

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
          printf("decompressed %zu spectrum bytes.\n", zfpsize);*/

        stream_close(stream);
    }

    // clean up
    zfp_field_free(field);
    zfp_stream_close(zfp);

    /*for (size_t i = 0; i < spectrumLength; i++)
      printf("%zu:%f|", i, spectrumBuffer[i]);
    printf("\n");
    printf("spectrumLength: %zu, buffer:%p\n", spectrumLength, spectrumBuffer);*/

    wasmBuffer.ptr = (unsigned int)spectrumBuffer;
    wasmBuffer.size = (unsigned int)spectrumLength;
    return wasmBuffer;

    // return val(typed_memory_view(spectrumLength, spectrumBuffer));
}

std::vector<unsigned char> decompressLZ4(int img_width, int img_height, std::string const &bytes)
{
    std::cout << "[decompressLZ4] " << bytes.size() << " bytes." << std::endl;

    size_t mask_size = size_t(img_width) * size_t(img_height);
    int compressed_size = bytes.size();
    int decompressed_size = 0;

    std::vector<unsigned char> mask(mask_size);

    decompressed_size = LZ4_decompress_safe((char *)bytes.data(), (char *)mask.data(), compressed_size, mask_size);

    std::cout << "[decompressLZ4] mask size: " << mask_size << ", decompressed " << decompressed_size << " mask pixels." << std::endl;

    if (decompressed_size < 0)
        return std::vector<unsigned char>();

    return mask;
}

/*val*/ buffer decompressLZ4mask(int img_width, int img_height, std::string const &bytes)
{
    buffer wasmBuffer = {0, 0};

    // std::cout << "[decompressLZ4val] " << bytes.size() << " bytes." << std::endl;

    size_t mask_size = size_t(img_width) * size_t(img_height);
    int compressed_size = bytes.size();
    int decompressed_size = 0;

    if (alphaBuffer != NULL && alphaLength != mask_size)
    {
        free(alphaBuffer);

        alphaBuffer = NULL;
        alphaLength = 0;
    }

    if (alphaBuffer == NULL)
    {
        alphaLength = mask_size;
        alphaBuffer = (unsigned char *)calloc(alphaLength, sizeof(unsigned char));
    }

    if (alphaBuffer == NULL)
    {
        alphaLength = 0;
        // return val(typed_memory_view(alphaLength, alphaBuffer));
        return wasmBuffer;
    }

    decompressed_size = LZ4_decompress_safe((char *)bytes.data(), (char *)alphaBuffer, compressed_size, alphaLength);

    // std::cout << "[decompressLZ4] mask size: " << mask_size << ", decompressed " << decompressed_size << " bytes." << std::endl;

    wasmBuffer.ptr = (unsigned int)alphaBuffer;
    wasmBuffer.size = (unsigned int)alphaLength;
    return wasmBuffer;

    // return val(typed_memory_view(alphaLength, alphaBuffer));
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
    function("decompressZFPspectrum", &decompressZFPspectrum);
    function("decompressLZ4", &decompressLZ4);
    function("decompressLZ4mask", &decompressLZ4mask);
    function("hevc_init_frame", &hevc_init_frame);
    function("hevc_destroy_frame", &hevc_destroy_frame);
    function("hevc_decode_frame", &hevc_decode_frame);
}