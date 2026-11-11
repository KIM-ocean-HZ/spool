// strip-legacy-icon <Assets.car>
//
// Removes, in place, the flattened app icon that actool derives from an Icon
// Composer .icon for systems before macOS 26: the "Icon Image" renditions (part
// 220), their "MultiSized Image" index (part 218) and the packed atlas that only
// the smallest of those images link into. The glass icon stacks, their groups,
// vectors, colours and gradients are kept, so macOS 26 and later draw the same
// icon as before.
//
// Why: macOS 15 and earlier also read the app icon from Assets.car when
// CFBundleIconName is set, and actool renders that flattened set in Icon
// Composer's design generation 26 (lighter, a diagonal glass streak) rather than
// the reviewed ICNS. Xcode 26.1 and later ignore
// --enable-icon-stack-fallback-generation, so the set cannot be turned off at
// compile time. With it gone, older systems fall back to CFBundleIconFile
// (icon.icns).
//
// This uses CoreUI's private CUIMutableCommonAssetStorage (approved 2026-11-11).
// It runs only in scripts/generate-icon.mjs, never in the app. It refuses any
// catalog that does not have exactly the shape actool 27 produces, so a format
// change fails loudly instead of writing a damaged catalog. Run
// `assetutil --update-bitmap` afterwards; the generator does.

#import <Foundation/Foundation.h>
#import <objc/message.h>
#import <dlfcn.h>

typedef struct { uint16_t identifier; uint16_t value; } KeyToken;

enum { kAttributeElement = 1, kAttributePart = 2 };
enum { kElementIcon = 85, kPartFlattenedImage = 220, kPartSizeSet = 218 };
enum { kElementPacked = 9, kPartPacked = 181 };
enum { kLayoutInternalLink = 1003, kLayoutPackedImage = 1004, kLayoutMultisizeSet = 1010, kLayoutIconStack = 1019 };

static uint16_t tokenValue(const KeyToken *tokens, uint16_t identifier) {
  for (; tokens->identifier; tokens++) {
    if (tokens->identifier == identifier) return tokens->value;
  }
  return 0;
}

static uint16_t layoutOf(NSData *rendition) {
  uint16_t layout = 0;
  if (rendition.length > 40) memcpy(&layout, (const uint8_t *)rendition.bytes + 36, sizeof layout);
  return layout;
}

int main(int argc, char **argv) {
  @autoreleasepool {
    if (argc != 2) {
      fprintf(stderr, "usage: strip-legacy-icon <Assets.car>\n");
      return 2;
    }
    if (!dlopen("/System/Library/PrivateFrameworks/CoreUI.framework/CoreUI", RTLD_NOW)) {
      fprintf(stderr, "strip-legacy-icon: CoreUI is unavailable\n");
      return 1;
    }
    Class storageClass = NSClassFromString(@"CUIMutableCommonAssetStorage");
    if (!storageClass) {
      fprintf(stderr, "strip-legacy-icon: CUIMutableCommonAssetStorage is unavailable\n");
      return 1;
    }
    NSString *path = [NSString stringWithUTF8String:argv[1]];
    id storage = ((id (*)(id, SEL, id, BOOL))objc_msgSend)([storageClass alloc], NSSelectorFromString(@"initWithPath:forWriting:"), path, YES);
    if (!storage) {
      fprintf(stderr, "strip-legacy-icon: cannot open %s for writing\n", argv[1]);
      return 1;
    }

    const uint32_t *keyFormat = ((const uint32_t *(*)(id, SEL))objc_msgSend)(storage, NSSelectorFromString(@"keyFormat"));
    const uint32_t attributeCount = keyFormat[2];
    NSMutableArray<NSData *> *remove = [NSMutableArray array];
    int images = 0, links = 0, sizeSets = 0, atlases = 0, stacks = 0;

    for (id renditionKey in ((id (*)(id, SEL))objc_msgSend)(storage, NSSelectorFromString(@"allAssetKeys"))) {
      const KeyToken *tokens = ((const KeyToken *(*)(id, SEL))objc_msgSend)(renditionKey, NSSelectorFromString(@"keyList"));
      NSMutableData *key = [NSMutableData dataWithLength:attributeCount * sizeof(uint16_t)];
      uint16_t *values = key.mutableBytes;
      for (uint32_t i = 0; i < attributeCount; i++) values[i] = tokenValue(tokens, keyFormat[3 + i]);

      uint16_t element = tokenValue(tokens, kAttributeElement);
      uint16_t part = tokenValue(tokens, kAttributePart);
      uint16_t layout = layoutOf(((id (*)(id, SEL, id))objc_msgSend)(storage, NSSelectorFromString(@"assetForKey:"), key));

      if (element == kElementIcon && part == kPartFlattenedImage) {
        images++;
        if (layout == kLayoutInternalLink) links++;
        [remove addObject:key];
      } else if (element == kElementIcon && part == kPartSizeSet && layout == kLayoutMultisizeSet) {
        sizeSets++;
        [remove addObject:key];
      } else if (element == kElementPacked && part == kPartPacked && layout == kLayoutPackedImage) {
        atlases++;
        [remove addObject:key];
      } else if (layout == kLayoutIconStack) {
        stacks++;
      }
    }

    // actool 27 writes seven flattened images (the three smallest link into one
    // packed atlas), one size set, and a light, dark and tintable icon stack.
    if (images != 7 || sizeSets != 1 || stacks != 3 || atlases != (links ? 1 : 0)) {
      fprintf(stderr, "strip-legacy-icon: unexpected catalog (%d flattened images, %d linked, %d size sets, %d packed atlases, %d icon stacks); nothing written\n",
              images, links, sizeSets, atlases, stacks);
      return 1;
    }

    for (NSData *key in remove) {
      ((void (*)(id, SEL, id))objc_msgSend)(storage, NSSelectorFromString(@"removeAssetForKey:"), key);
    }
    if (!((BOOL (*)(id, SEL, BOOL))objc_msgSend)(storage, NSSelectorFromString(@"writeToDiskAndCompact:"), YES)) {
      fprintf(stderr, "strip-legacy-icon: writing %s failed\n", argv[1]);
      return 1;
    }
    printf("[icon] Removed the flattened pre-macOS 26 icon from Assets.car (%d images, %d size set, %d packed atlas); kept %d icon stacks.\n",
           images, sizeSets, atlases, stacks);
  }
  return 0;
}
