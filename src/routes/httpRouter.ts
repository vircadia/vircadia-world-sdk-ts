import { Router as ExpressRouter } from 'express';
import { E_RequestType, I_REQUEST_StatusResponse } from './meta';
import { Supabase } from '../server/modules/supabase/supabase';

// Create a router instance
const router = ExpressRouter();

router.get(E_RequestType.STATUS, async (req, res) => {
    const { apiUrl, s3StorageUrl } = await Supabase.getInstance(false).status();

    const response: I_REQUEST_StatusResponse = {
        REALTIME_API_URL: apiUrl,
        S3_STORAGE_URL: s3StorageUrl,
    };

    res.json(response);
});

export namespace HTTPTransport {
    export const Routes = router;
}