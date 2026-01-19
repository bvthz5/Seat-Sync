import { toast as hotToast, ToastOptions } from 'react-hot-toast';

/**
 * A wrapper around react-hot-toast to ensure only one toast is displayed at a time.
 * Calling any method will dismiss all existing toasts before showing the new one.
 */
export const toast = {
    success: (message: string, options?: ToastOptions) => {
        hotToast.dismiss();
        return hotToast.success(message, options);
    },
    error: (message: string, options?: ToastOptions) => {
        hotToast.dismiss();
        return hotToast.error(message, options);
    },
    loading: (message: string, options?: ToastOptions) => {
        hotToast.dismiss();
        return hotToast.loading(message, options);
    },
    custom: (message: string, options?: ToastOptions) => {
        hotToast.dismiss();
        // @ts-ignore
        return hotToast(message, options);
    },
    dismiss: (toastId?: string) => {
        hotToast.dismiss(toastId);
    },
    promise: <T>(
        promise: Promise<T>,
        msgs: {
            loading: string;
            success: string | ((data: T) => string);
            error: string | ((error: any) => string);
        },
        opts?: ToastOptions
    ) => {
        hotToast.dismiss();
        return hotToast.promise(promise, msgs, opts);
    }
};
