import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base design dimensions (iPhone 13 / Pixel 5)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

/**
 * Scale a size value relative to screen width.
 * Use for padding, margin, icon sizes, etc.
 */
export const scale = (size: number): number => {
    const ratio = SCREEN_WIDTH / BASE_WIDTH;
    const newSize = size * ratio;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Scale a size value relative to screen height.
 * Use for height-dependent layouts.
 */
export const verticalScale = (size: number): number => {
    const ratio = SCREEN_HEIGHT / BASE_HEIGHT;
    const newSize = size * ratio;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Moderate scale — less aggressive than full scale.
 * Great for font sizes and small spacings.
 * factor = 0 → no scale, factor = 1 → full scale
 */
export const moderateScale = (size: number, factor: number = 0.35): number => {
    const newSize = size + (scale(size) - size) * factor;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/** Responsive font size */
export const rf = (size: number): number => moderateScale(size);

/** Shorthand for scale (horizontal / general use) */
export const s = scale;

/** Shorthand for verticalScale */
export const vs = verticalScale;

/** Screen dimensions */
export const screen = {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    isSmall: SCREEN_WIDTH < 360,
    isMedium: SCREEN_WIDTH >= 360 && SCREEN_WIDTH < 414,
    isLarge: SCREEN_WIDTH >= 414,
    isTablet: SCREEN_WIDTH >= 768,
};

export default { scale, verticalScale, moderateScale, rf, s, vs, screen };
