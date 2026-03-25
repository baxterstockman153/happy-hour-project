let counter = 0;
export const v4 = () => `00000000-0000-0000-0000-${String(++counter).padStart(12, '0')}`;
