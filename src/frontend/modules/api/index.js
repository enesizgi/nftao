export const baseURL = 'http://localhost:3001';

class API {
  constructor() {
    this.baseURL = baseURL;

    this.fetchWithTimeout = timeout => async resource => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      const response = await fetch(resource, {
        ...timeout,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    };

    this.baseRequest = type => ({
      endpoint, qs = {}, header, body, timeout
    }) => {
      const fetchMethod = timeout ? this.fetchWithTimeout(timeout) : fetch;

      return fetchMethod(`${this.baseURL}${endpoint}${this.createQs(qs)}`, {
        method: type,
        ...header && { header },
        ...body && { body }
      }).then(response => response.json());
    };

    this.getRequest = this.baseRequest('GET');
    this.putRequest = this.baseRequest('PUT');
    this.deleteRequest = this.baseRequest('DELETE');
    this.postRequest = this.baseRequest('POST');
  }

  createQs = qs => {
    const keys = Object.keys(qs);
    if (keys.length === 0) {
      return '';
    }
    let str = '?';
    keys.forEach(key => {
      str = str.concat(`${key}=${qs[key]}&`);
    });
    return str.slice(0, -1);
  };

  getFromIPFS = async (cid, timeout) => this.getRequest({ endpoint: '/get-from-ipfs', qs: { cid }, timeout });

  uploadToIPFS = async formData => this.postRequest({ endpoint: '/upload-to-ipfs', body: formData });

  uploadMetadataToIPFS = async metadata => this.postRequest({ endpoint: '/upload-metadata-to-ipfs', body: metadata });

  getUserSlug = async id => this.getRequest({ endpoint: '/user/slug', qs: { id } });

  getUsername = async id => this.getRequest({ endpoint: '/user/name', qs: { id } });

  getUserIDFromSlug = async slug => this.getRequest({ endpoint: '/user/id', qs: { slug } });

  getProfilePhoto = async id => this.getRequest({ endpoint: '/user/profile-photo', qs: { id } });

  getCoverPhoto = async id => this.getRequest({ endpoint: '/user/cover-photo', qs: { id } });
}

export default new API();