export interface TokenResponse {

  /**
   * If present, this tells the app that it is being rendered within an
   * EHR frame and the UI outside that frame already displays the selected
   * patient's name, age, gender etc. The app can decide to hide those
   * details to prevent the UI from duplicated information.
   */
  need_patient_banner?: boolean;

  /**
   * This could be a public location of some style settings that the EHR
   * would like to suggest. The app might look it up and optionally decide
   * to apply some or all of it.
   * @see https://launch.smarthealthit.org/smart-style.json
   */
  smart_style_url?: string;

  /**
   * If you have requested that require it (like `launch` or `launch/patient`)
   * the selected patient ID will be available here.
   */
  patient?: string;

  /**
   * If you have requested that require it (like `launch` or `launch/encounter`)
   * the selected encounter ID will be available here.
   * **NOTE:** This is not widely supported as of 2018.
   */
  encounter?: string;

  /**
   * If you have requested `openid` and `profile` scopes the profile of
   * the active user will be available as `client_id`.
   * **NOTE:** Regardless of it's name, this property does not store an ID
   * but a token that also suggests the user type like `Patient/123`,
   * `Practitioner/xyz` etc.
   */
  client_id?: string;

  /**
   * Fixed value: bearer
   */
  token_type?: "bearer" | "Bearer";

  /**
   * Scope of access authorized. Note that this can be different from the
   * scopes requested by the app.
   */
  scope?: string;

  /**
   * Lifetime in seconds of the access token, after which the token SHALL NOT
   * be accepted by the resource server
   */
  expires_in?: number;

  /**
   * The access token issued by the authorization server
   */
  access_token?: string;

  /**
   * Authenticated patient identity and profile, if requested
   */
  id_token?: string;

  /**
   * Token that can be used to obtain a new access token, using the same or a
   * subset of the original authorization grants
   */
  refresh_token?: string;

  /**
   * Other properties might be passed by the server
   */
  [key: string]: any;
}
