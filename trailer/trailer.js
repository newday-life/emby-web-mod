(function () {
    class Util {
        static upLocal() {
            const storageName = [];
            for (var i = 0; i < localStorage.length; i++) {
                if (localStorage.key(i).includes("TRAILERCACHE|")) {
                    let val = localStorage.getItem(localStorage.key(i));
                    if (!val) continue;
                    try {
                        val = JSON.parse(val);
                        if (Date.now() - val.time > val.expired) {
                            storageName.push(localStorage.key(i));
                        }
                    } catch (error) {
                        storageName.push(localStorage.key(i));
                        console.log("error:", error);
                    }

                }
            }
            storageName.length > 0 && storageName.forEach((name) => {
                localStorage.removeItem(name);
            });
        }
    }
    Util.upLocal();
    /* 预告URL缓存2天 */
    const trailer_cache_time = 2 * 8.64e7;
    const storage = {
        set(key, val, expired) {
            let obj = { data: val, time: Date.now(), expired };
            localStorage.setItem(key, JSON.stringify(obj));
        },
        get(key) {
            let val = localStorage.getItem(key);
            if (!val) { return val; }
            val = JSON.parse(val);
            if (Date.now() - val.time > val.expired) {
                localStorage.removeItem(key);
                return null
            }
            return val.data;
        },
        remove(key) {
            localStorage.removeItem(key);
        }
    };

    const cache = {
        trailer: new Map()
    };

    function useVideo() {
        const handleKeydown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const { code, target } = e;
            if (code === "KeyM") target.muted = !target.muted;
            if (code === "KeyW" || code === "ArrowUp") target.volume += 0.1;
            if (code === "KeyA" || code === "ArrowLeft") target.currentTime -= 2;
            if (code === "KeyS" || code === "ArrowDown") target.volume -= 0.1;
            if (code === "KeyD" || code === "ArrowRight") target.currentTime += 4;
        };

        const handleVolumechange = ({ target }) => localStorage.setItem("volume", target.volume);

        return (src, poster) => {
            const video = document.createElement("video");

            video.src = src;
            video.title = "";
            video.poster = poster;
            video.controls = true;
            video.preload = "none";
            video.volume = localStorage.getItem("volume") ?? 0.2;

            video.addEventListener("keydown", handleKeydown);
            video.addEventListener("volumechange", handleVolumechange);
            return video;
        };
    }

    const createVideo = useVideo();

    (function () {
        const TARGET_SELECTOR = ".itemsContainer .cardOverlayContainer";

        ((a) => {
            if (typeof GM_addStyle == "function") {
                GM_addStyle(a);
                return;
            }
            const t = document.createElement("style");
            (t.textContent = a), document.head.append(t);
        })(`
            ${TARGET_SELECTOR} video {
                position: absolute;
                inset: 0;
                z-index: 1;
                width: 100%;
                height: 100%;
                background: #000;
                opacity: 0;
                transition: opacity 0.2s ease-in-out;
                object-fit: contain;
            }
            ${TARGET_SELECTOR} video.fade-in {
                opacity: 1;
            }
        `);

        let currElem = null;

        function handleMouse(onHover) {
            const interval = 200;
            const sensitivity = 0;

            let scrollTimer = null;
            let isScrolling = false;
            let trackSpeedInterval = null;

            let prevX = null;
            let prevY = null;
            let prevTime = null;

            let lastX = null;
            let lastY = null;
            let lastTime = null;

            const handleMouseover = (e) => {
                if (currElem) return;

                const target = e.target.closest(TARGET_SELECTOR);
                if (!target) return;

                prevX = e.pageX;
                prevY = e.pageY;
                prevTime = Date.now();

                currElem = target;
                currElem.addEventListener("mousemove", handleMousemove);
                trackSpeedInterval = setInterval(trackSpeed, interval);
            };

            const handleMousemove = (e) => {
                lastX = e.pageX;
                lastY = e.pageY;
                lastTime = Date.now();
            };

            const trackSpeed = () => {
                let speed;

                if (!lastTime || lastTime === prevTime) {
                    speed = 0;
                } else {
                    speed = Math.sqrt(Math.pow(prevX - lastX, 2) + Math.pow(prevY - lastY, 2)) / (lastTime - prevTime);
                }

                if (speed <= sensitivity && isElementInViewport(currElem) && !isScrolling) {
                    destroy(currElem);
                    onHover(currElem);
                } else {
                    prevX = lastX;
                    prevY = lastY;
                    prevTime = Date.now();
                }
            };

            const isElementInViewport = (elem) => {
                const rect = elem.getBoundingClientRect();
                return (
                    rect.top >= 0 &&
                    rect.left >= 0 &&
                    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
                );
            };

            const handleMouseout = ({ relatedTarget }) => {
                if (!currElem) return;

                let node = relatedTarget;
                while (node) {
                    if (node === currElem) return;
                    node = node.parentNode;
                }

                destroy(currElem);
                onLeave();
                currElem = null;
            };

            const destroy = (elem) => {
                elem.removeEventListener("mousemove", handleMousemove);
                clearInterval(trackSpeedInterval);
            };

            const onLeave = () => {
                if (window.youtubeplayer) { youtubeplayer.destroy(); youtubeplayer = null; }
                const videos = document.querySelectorAll(`${TARGET_SELECTOR} video`);
                videos.forEach((video) => {
                    video.classList.remove("fade-in");
                    setTimeout(() => video.remove(), 200);
                });
            };

            const onOver = () => {
                if (!currElem) return;

                destroy(currElem);
                onLeave();
                currElem = null;
            };

            const handleScroll = () => {
                isScrolling = true;
                clearTimeout(scrollTimer);
                scrollTimer = setTimeout(() => {
                    isScrolling = false;
                }, 500);
            };

            document.addEventListener("mouseover", handleMouseover);
            document.addEventListener("mouseout", handleMouseout);
            document.addEventListener("visibilitychange", onOver);
            window.addEventListener("scroll", handleScroll);
            window.addEventListener("blur", onOver);
        }

        function handleHover() {
            const setVideo = (elem, trailer, cover) => {
                const video = createVideo(trailer, cover);
                elem.append(video);

                video.muted = true;
                video.currentTime = 4;
                video.focus();
                video.setAttribute('crossorigin', 'anonymous');
                video.play();

                const ctx = new AudioContext();
                const canAutoPlay = ctx.state === "running";
                ctx.close();

                if (canAutoPlay) video.muted = false;
                setTimeout(() => video.classList.add("fade-in"), 50);
            };
            const setYouTube = (elem, id) => {
                const videoContainer = document.createElement('video');
                videoContainer.id = 'player';
                videoContainer.style.zIndex = 1;
                videoContainer.style["pointer-events"] = "none";
                elem.append(videoContainer);
                window.youtubeplayer = new YT.Player(videoContainer, {
                    height: '100%', width: '100%', videoId: id,
                    events: {
                        'onReady': event => {
                            event.target.mute();
                            event.target.playVideo();
                        },
                        'onStateChange': event => {

                            if (event.data === YT.PlayerState.UNSTARTED) {
                                // event.target.playVideo();
                            }
                            if (event.data === YT.PlayerState.ENDED) {
                                if (youtubeplayer) { youtubeplayer.destroy(); youtubeplayer = null; }
                            }

                        },
                        'onError': () => {
                            console.error(`YouTube prevented playback of '${id}'`);
                            if (youtubeplayer) { youtubeplayer.destroy(); youtubeplayer = null; }
                        }
                    },
                    playerVars: {
                        autoplay: 1,
                        controls: 0,
                        enablejsapi: 1,
                        modestbranding: 1,
                        rel: 0,
                        showinfo: 0,
                        fs: 0,
                        playsinline: 1,
                    },
                });
            }
            const setRemoteTrailer = (elem, url) => {
                if (!url || elem.querySelector("video")) return;
                if (url.includes('youtube.com') || url.includes('youtu.be')) {
                    let youtubeid = new URL(url).searchParams.get('v') || new URL(url).pathname.split('/').pop();

                    if (window.YT) {
                        window.YT.ready(function () { if (elem === currElem) setYouTube(elem, youtubeid) })
                    }
                    else {
                        var _reason, firstScriptTag;
                        !document.getElementById("youtubeapi") &&
                            (((_reason = document.createElement("script")).src = "https://www.youtube.com/iframe_api"), _reason.id = "youtubeapi",
                                (firstScriptTag = document.getElementsByTagName("script")[0]).parentNode.insertBefore(_reason, firstScriptTag), _reason.onload = function () {
                                    let isexistsyt = setInterval(() => {
                                        window.YT && (clearInterval(isexistsyt), window.YT.ready(function () { if (elem === currElem) setYouTube(elem, youtubeid) }));
                                    }, 1000);
                                    setTimeout(() => clearInterval(isexistsyt), 10000);
                                });
                    }
                };
            };
            const LOAD_TRAILER = "x-loading-trailers";

            return async (elem) => {
                const { classList, dataset } = elem;
                if (classList.contains(LOAD_TRAILER)) return;
                let { trailer, cover, mid } = dataset;
                if (trailer) {
                    if (trailer.includes('youtube.com') || trailer.includes('youtu.be')) {
                        return setRemoteTrailer(elem, trailer);
                    } else {
                        return setVideo(elem, trailer, cover);
                    }
                }

                if (!cover || !mid) {
                    const parentNode = elem.closest(".card");
                    if (!parentNode) return;
                    var _itemSource = parentNode.closest(".itemsContainer")?._itemSource || parentNode.closest(".itemsContainer")?.items;
                    if (!_itemSource) return;
                    var _item = _itemSource[parentNode._dataItemIndex ?? parentNode.dataset.index]
                    if (!_item) return;
                    if (_item.Type !== 'Movie' || _item.MarkerType === 'Chapter') return;
                    cover = parentNode.querySelector("img").src;
                    mid = _item.Id;
                    if (!mid) return;
                    dataset.mid = mid;
                    dataset.cover = cover;
                    const setTrailer = (trailer) => {
                        if (!trailer || elem.querySelector("video")) return;
                        if (!dataset.trailer) {
                            dataset.trailer = trailer;
                        }
                        if (elem === currElem) setVideo(elem, trailer, cover);
                    };

                    const trailerMid = `TRAILERCACHE|${mid}`;
                    trailer = storage.get(trailerMid)
                    if (trailer) {
                        if (trailer.includes('youtube.com') || trailer.includes('youtu.be')) {
                            dataset.trailer = trailer;
                            return setRemoteTrailer(elem, trailer);
                        } else {
                            dataset.trailer = trailer;
                            return setVideo(elem, trailer, cover);
                        }
                    }


                    classList.add(LOAD_TRAILER);
                    const Fullitem = await ApiClient.getItem(ApiClient.getCurrentUserId(), _item.Id);
                    if (Fullitem.LocalTrailerCount > 0) {
                        let url = await getTrailersUrl(trailerMid, _item);
                        dataset.trailer = url;
                        setTrailer(url);
                    } else if (Fullitem.RemoteTrailers?.length > 0) {
                        let url = Fullitem.RemoteTrailers[0].Url;
                        storage.set(trailerMid, url, trailer_cache_time);
                        dataset.trailer = url;
                        setRemoteTrailer(elem, url);
                    }
                }
                classList.remove(LOAD_TRAILER);
            };
        }
        handleMouse(handleHover());
    })();
    async function getTrailersUrl(trailerMid, item) {
        var videourl = "";
        return ((typeof Storage !== "undefined" && !storage.get(trailerMid) && !cache.trailer.has(item.Id)) ? (
            await ApiClient.getLocalTrailers(ApiClient.getCurrentUserId(), item.Id).then(
                async function (trailers) {
                    for (let l = 0; l < trailers.length; ++l) {
                        let trailerurl = (await ApiClient.getPlaybackInfo(trailers[l].Id, {},
                            { "MaxStaticBitrate": 140000000, "MaxStreamingBitrate": 140000000, "MusicStreamingTranscodingBitrate": 192000, "DirectPlayProfiles": [{ "Container": "mp4,m4v", "Type": "Video", "VideoCodec": "h264,h265,hevc,av1,vp8,vp9", "AudioCodec": "ac3,eac3,mp3,aac,opus,flac,vorbis" }, { "Container": "mkv", "Type": "Video", "VideoCodec": "h264,h265,hevc,av1,vp8,vp9", "AudioCodec": "ac3,eac3,mp3,aac,opus,flac,vorbis" }, { "Container": "flv", "Type": "Video", "VideoCodec": "h264", "AudioCodec": "aac,mp3" }, { "Container": "mov", "Type": "Video", "VideoCodec": "h264", "AudioCodec": "ac3,eac3,mp3,aac,opus,flac,vorbis" }, { "Container": "opus", "Type": "Audio" }, { "Container": "mp3", "Type": "Audio", "AudioCodec": "mp3" }, { "Container": "mp2,mp3", "Type": "Audio", "AudioCodec": "mp2" }, { "Container": "aac", "Type": "Audio", "AudioCodec": "aac" }, { "Container": "m4a", "AudioCodec": "aac", "Type": "Audio" }, { "Container": "mp4", "AudioCodec": "aac", "Type": "Audio" }, { "Container": "flac", "Type": "Audio" }, { "Container": "webma,webm", "Type": "Audio" }, { "Container": "wav", "Type": "Audio", "AudioCodec": "PCM_S16LE,PCM_S24LE" }, { "Container": "ogg", "Type": "Audio" }, { "Container": "webm", "Type": "Video", "AudioCodec": "vorbis,opus", "VideoCodec": "av1,VP8,VP9" }], "TranscodingProfiles": [{ "Container": "aac", "Type": "Audio", "AudioCodec": "aac", "Context": "Streaming", "Protocol": "hls", "MaxAudioChannels": "2", "MinSegments": "1", "BreakOnNonKeyFrames": true }, { "Container": "aac", "Type": "Audio", "AudioCodec": "aac", "Context": "Streaming", "Protocol": "http", "MaxAudioChannels": "2" }, { "Container": "mp3", "Type": "Audio", "AudioCodec": "mp3", "Context": "Streaming", "Protocol": "http", "MaxAudioChannels": "2" }, { "Container": "opus", "Type": "Audio", "AudioCodec": "opus", "Context": "Streaming", "Protocol": "http", "MaxAudioChannels": "2" }, { "Container": "wav", "Type": "Audio", "AudioCodec": "wav", "Context": "Streaming", "Protocol": "http", "MaxAudioChannels": "2" }, { "Container": "opus", "Type": "Audio", "AudioCodec": "opus", "Context": "Static", "Protocol": "http", "MaxAudioChannels": "2" }, { "Container": "mp3", "Type": "Audio", "AudioCodec": "mp3", "Context": "Static", "Protocol": "http", "MaxAudioChannels": "2" }, { "Container": "aac", "Type": "Audio", "AudioCodec": "aac", "Context": "Static", "Protocol": "http", "MaxAudioChannels": "2" }, { "Container": "wav", "Type": "Audio", "AudioCodec": "wav", "Context": "Static", "Protocol": "http", "MaxAudioChannels": "2" }, { "Container": "mkv", "Type": "Video", "AudioCodec": "ac3,eac3,mp3,aac,opus,flac,vorbis", "VideoCodec": "h264,h265,hevc,av1,vp8,vp9", "Context": "Static", "MaxAudioChannels": "2", "CopyTimestamps": true }, { "Container": "m4s,ts", "Type": "Video", "AudioCodec": "ac3,mp3,aac", "VideoCodec": "h264,h265,hevc", "Context": "Streaming", "Protocol": "hls", "MaxAudioChannels": "2", "MinSegments": "1", "BreakOnNonKeyFrames": true, "ManifestSubtitles": "vtt" }, { "Container": "webm", "Type": "Video", "AudioCodec": "vorbis", "VideoCodec": "vpx", "Context": "Streaming", "Protocol": "http", "MaxAudioChannels": "2" }, { "Container": "mp4", "Type": "Video", "AudioCodec": "ac3,eac3,mp3,aac,opus,flac,vorbis", "VideoCodec": "h264", "Context": "Static", "Protocol": "http" }], "ContainerProfiles": [], "CodecProfiles": [{ "Type": "VideoAudio", "Codec": "aac", "Conditions": [{ "Condition": "Equals", "Property": "IsSecondaryAudio", "Value": "false", "IsRequired": "false" }] }, { "Type": "VideoAudio", "Conditions": [{ "Condition": "Equals", "Property": "IsSecondaryAudio", "Value": "false", "IsRequired": "false" }] }, { "Type": "Video", "Codec": "h264", "Conditions": [{ "Condition": "EqualsAny", "Property": "VideoProfile", "Value": "high|main|baseline|constrained baseline|high 10", "IsRequired": false }, { "Condition": "LessThanEqual", "Property": "VideoLevel", "Value": "62", "IsRequired": false }] }, { "Type": "Video", "Codec": "hevc", "Conditions": [] }], "SubtitleProfiles": [{ "Format": "vtt", "Method": "Hls" }, { "Format": "eia_608", "Method": "VideoSideData", "Protocol": "hls" }, { "Format": "eia_708", "Method": "VideoSideData", "Protocol": "hls" }, { "Format": "vtt", "Method": "External" }, { "Format": "ass", "Method": "External" }, { "Format": "ssa", "Method": "External" }], "ResponseProfiles": [{ "Type": "Video", "Container": "m4v", "MimeType": "video/mp4" }] }
                        )).MediaSources[0];

                        if (trailerurl.Protocol == "File") {
                            videourl = `${ApiClient.serverAddress()}/emby${trailerurl.DirectStreamUrl}`;
                            if (typeof Storage !== "undefined") storage.set(trailerMid, videourl, trailer_cache_time);
                            cache.trailer.set(item.Id, videourl);
                            break
                        } else if (trailerurl.Protocol == "Http") {
                            videourl = trailerurl.Path;
                            if (typeof Storage !== "undefined") storage.set(trailerMid, videourl, trailer_cache_time);
                            cache.trailer.set(item.Id, videourl);
                        }
                    }
                })
        ) : videourl = (typeof Storage !== "undefined" ? storage.get(trailerMid) : cache.trailer.get(item.Id))), videourl
    }
})();
