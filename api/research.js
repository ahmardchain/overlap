import {handleApi} from '../worker/index.js';
export default {fetch(request){return handleApi(request,process.env)}};
