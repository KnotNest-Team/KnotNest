import useFetch from '../hooks/useFetch';
import { vendorApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { errMsg } from '../utils/format';

/** Loads the signed-in vendor's own profile and exposes save(patch) that persists to MongoDB. */
export default function useVendor() {
  const toast = useToast();
  const state = useFetch(() => vendorApi.mine());
  const vendor = state.data?.vendor;
  const save = async (patch, message = 'Saved') => {
    try {
      await vendorApi.update(vendor._id, patch);
      await state.reload();
      if (message) toast.success(message);
      return true;
    } catch (e) { toast.error(errMsg(e)); return false; }
  };
  return { ...state, vendor, save };
}
