import { Router as ExpressRouter } from 'express';
import {
    Server
} from '../../meta.js';

// Create a router instance
const router = ExpressRouter();

router.get(Server.E_HTTPRequestPath.CONFIG_AND_STATUS, (req, res) => {
    const response: Server.I_REQUEST_ConfigAndStatusResponse = {
        API_URL: Server.E_HTTPRoute.API,
        S3_STORAGE_URL: Server.E_HTTPRoute.STORAGE,
    };

    res.json(response);
});

export namespace HTTPTransport {
    export const Routes = router;
}
