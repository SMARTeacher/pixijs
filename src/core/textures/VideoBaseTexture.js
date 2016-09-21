import BaseTexture from './BaseTexture';
import utils from '../utils';

/**
 * A texture of a [playing] Video.
 *
 * Video base textures mimic Pixi BaseTexture.from.... method in their creation process.
 *
 * This can be used in several ways, such as:
 *
 * ```js
 * let texture = PIXI.VideoBaseTexture.fromUrl('http://mydomain.com/video.mp4');
 *
 * let texture = PIXI.VideoBaseTexture.fromUrl({ src: 'http://mydomain.com/video.mp4', mime: 'video/mp4' });
 *
 * let texture = PIXI.VideoBaseTexture.fromUrls(['/video.webm', '/video.mp4']);
 *
 * let texture = PIXI.VideoBaseTexture.fromUrls([
 *     { src: '/video.webm', mime: 'video/webm' },
 *     { src: '/video.mp4', mime: 'video/mp4' }
 * ]);
 * ```
 *
 * See the ["deus" demo](http://www.goodboydigital.com/pixijs/examples/deus/).
 *
 * @class
 * @extends PIXI.BaseTexture
 * @memberof PIXI
 * @param source {HTMLVideoElement} Video source
 * @param [scaleMode=PIXI.SCALE_MODES.DEFAULT] {number} See {@link PIXI.SCALE_MODES} for possible values
 */
class VideoBaseTexture extends BaseTexture
{
    constructor(source, scaleMode)
    {
        if (!source)
        {
            throw new Error('No video source element specified.');
        }

        // hook in here to check if video is already available.
        // BaseTexture looks for a source.complete boolean, plus width & height.

        if ((source.readyState === source.HAVE_ENOUGH_DATA || source.readyState === source.HAVE_FUTURE_DATA) && source.width && source.height)
        {
            source.complete = true;
        }

        super(source, scaleMode);

        /**
         * Should the base texture automatically update itself, set to true by default
         *
         * @member {boolean}
         * @default true
         */
        this.autoUpdate = false;

        this._onUpdate = this._onUpdate.bind(this);
        this._onCanPlay = this._onCanPlay.bind(this);

        if (!source.complete)
        {
            source.addEventListener('canplay', this._onCanPlay);
            source.addEventListener('canplaythrough', this._onCanPlay);

            // started playing..
            source.addEventListener('play', this._onPlayStart.bind(this));
            source.addEventListener('pause', this._onPlayStop.bind(this));
        }

        this.__loaded = false;
    }

    /**
     * The internal update loop of the video base texture, only runs when autoUpdate is set to true
     *
     * @private
     */
    _onUpdate()
    {
        if (this.autoUpdate)
        {
            window.requestAnimationFrame(this._onUpdate);
            this.update();
        }
    }

    /**
     * Runs the update loop when the video is ready to play
     *
     * @private
     */
    _onPlayStart()
    {
        // Just in case the video has not recieved its can play even yet..
        if(!this.hasLoaded)
        {
            this._onCanPlay();
        }

        if (!this.autoUpdate)
        {
            window.requestAnimationFrame(this._onUpdate);
            this.autoUpdate = true;
        }
    }

    /**
     * Fired when a pause event is triggered, stops the update loop
     *
     * @private
     */
    _onPlayStop()
    {
        this.autoUpdate = false;
    }

    /**
     * Fired when the video is loaded and ready to play
     *
     * @private
     */
    _onCanPlay()
    {
        this.hasLoaded = true;

        if (this.source)
        {
            this.source.removeEventListener('canplay', this._onCanPlay);
            this.source.removeEventListener('canplaythrough', this._onCanPlay);

            this.width = this.source.videoWidth;
            this.height = this.source.videoHeight;

            this.source.play();

            // prevent multiple loaded dispatches..
            if (!this.__loaded)
            {
                this.__loaded = true;
                this.emit('loaded', this);
            }
        }
    }

    /**
     * Destroys this texture
     *
     */
    destroy()
    {
        if (this.source && this.source._pixiId)
        {
            delete utils.BaseTextureCache[ this.source._pixiId ];
            delete this.source._pixiId;
        }

        super.destroy();
    }

    /**
     * Mimic Pixi BaseTexture.from.... method.
     *
     * @static
     * @param video {HTMLVideoElement} Video to create texture from
     * @param [scaleMode=PIXI.SCALE_MODES.DEFAULT] {number} See {@link PIXI.SCALE_MODES} for possible values
     * @return {PIXI.VideoBaseTexture} Newly created VideoBaseTexture
     */
    static fromVideo(video, scaleMode)
    {
        if (!video._pixiId)
        {
            video._pixiId = `video_${utils.uid()}`;
        }

        let baseTexture = utils.BaseTextureCache[video._pixiId];

        if (!baseTexture)
        {
            baseTexture = new VideoBaseTexture(video, scaleMode);
            utils.BaseTextureCache[ video._pixiId ] = baseTexture;
        }

        return baseTexture;
    }

    /**
     * Helper function that creates a new BaseTexture based on the given video element.
     * This BaseTexture can then be used to create a texture
     *
     * @static
     * @param videoSrc {string|object|string[]|object[]} The URL(s) for the video.
     * @param [videoSrc.src] {string} One of the source urls for the video
     * @param [videoSrc.mime] {string} The mimetype of the video (e.g. 'video/mp4'). If not specified
     *  the url's extension will be used as the second part of the mime type.
     * @param scaleMode {number} See {@link PIXI.SCALE_MODES} for possible values
     * @return {PIXI.VideoBaseTexture} Newly created VideoBaseTexture
     */
    static fromUrl(videoSrc, scaleMode)
    {
        const video = document.createElement('video');

        // array of objects or strings
        if (Array.isArray(videoSrc))
        {
            for (let i = 0; i < videoSrc.length; ++i)
            {
                video.appendChild(createSource(videoSrc[i].src || videoSrc[i], videoSrc[i].mime));
            }
        }
        // single object or string
        else
        {
            video.appendChild(createSource(videoSrc.src || videoSrc, videoSrc.mime));
        }

        video.load();
        video.play();

        return VideoBaseTexture.fromVideo(video, scaleMode);
    }
}

VideoBaseTexture.fromUrls = VideoBaseTexture.fromUrl;

function createSource(path, type)
{
    if (!type)
    {
        type = `video/${path.substr(path.lastIndexOf('.') + 1)}`;
    }

    const source = document.createElement('source');

    source.src = path;
    source.type = type;

    return source;
}

export default VideoBaseTexture;
