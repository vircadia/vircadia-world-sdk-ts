import { Router as ExpressRouter } from 'express';
import {
    E_HTTPRequestPath,
    I_REQUEST_ConfigAndStatusResponse,
    E_HTTPRoute,
} from './meta.js';
import { Supabase } from '../server/modules/supabase/supabase.js';

// Create a router instance
const router = ExpressRouter();

router.get(E_HTTPRequestPath.CONFIG_AND_STATUS, (req, res) => {
    const response: I_REQUEST_ConfigAndStatusResponse = {
        API_URL: E_HTTPRoute.API,
        S3_STORAGE_URL: E_HTTPRoute.STORAGE,
    };

    res.json(response);
});

export namespace HTTPTransport {
    export const Routes = router;
}
