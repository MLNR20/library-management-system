/** Credit for the reading-room photo (see .hero-photo in index.css). Its licence requires it wherever the photo shows. */
export function PhotoCredit() {
    return (
        <p className="absolute right-3 bottom-2 text-xs text-white/70">
            Photo by{' '}
            <a
                href="https://commons.wikimedia.org/wiki/File:NYC_Public_Library_Research_Room_Jan_2006-1-_3.jpg"
                className="link link-hover"
                target="_blank"
                rel="noreferrer"
            >
                Diliff, edited by Vassil
            </a>
            ,{' '}
            <a href="https://creativecommons.org/licenses/by/2.5/" className="link link-hover" target="_blank" rel="noreferrer">
                CC BY 2.5
            </a>
            , resized
        </p>
    );
}
