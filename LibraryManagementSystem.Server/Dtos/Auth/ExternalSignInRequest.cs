namespace LibraryManagementSystem.Server.Dtos.Auth
{
    // IdToken is the Firebase ID token the browser got after the Google popup.
    public record ExternalSignInRequest(string IdToken);
}
