import React from 'react';
import './TwitterUserProfile.css';

const TwitterUserProfile = ({ userData }) => {
  return (
    <div className="twitter-profile-container">
      <div className="user-info">
        <div className="user-header">
          <img src={userData?.user?.profileImageUrl || "https://pbs.twimg.com/profile_images/1701493248269881344/uXTOJ_0J_normal.jpg"} alt={userData?.user?.name || "用户"} />
          <div>
            <h1>
              {userData?.user?.name || "未知用户"}
              {(userData?.user?.isBlueVerified || userData?.user?.isVerified) && <span className="verified-badge"></span>}
            </h1>
            <p>@{userData?.user?.screenName || ""}</p>
          </div>
        </div>
        
        <div className="user-desc">
          <p>{userData?.user?.description || "暂无简介"}</p>
          
          <div className="user-meta">
            {userData?.user?.location && <span>📍 {userData.user.location}</span>}
            {userData?.user?.createdAt && (
              <span>
                🗓️ {new Date(userData.user.createdAt).toLocaleString('zh-CN', { year: 'numeric', month: 'long' })}加入
              </span>
            )}
          </div>
          
          <div className="user-stats">
            <div>关注: {userData?.user?.friendsCount || 0}</div>
            <div>粉丝: {userData?.user?.followersCount || 0}</div>
            <div>推文: {userData?.user?.statusesCount || 0}</div>
            {userData?.user?.favouritesCount && <div>喜欢: {userData.user.favouritesCount}</div>}
          </div>
        </div>
      </div>

      {userData?.tweets && userData.tweets.length > 0 ? (
        <>
          <h2>推文 ({userData.tweets.length})</h2>
          {userData.tweets.map((tweet, index) => (
            <div className="tweet" key={tweet.id || index}>
              <div className="tweet-header">
                {tweet.user?.name || userData?.user?.name || ""} 
                {(tweet.user?.screen_name || userData?.user?.screenName) && 
                  `(@${tweet.user?.screen_name || userData?.user?.screenName})`}
              </div>
              <div className="tweet-text" dangerouslySetInnerHTML={{ __html: tweet.full_text?.replace(/\n/g, '<br>') || "" }} />
              
              {tweet.media && tweet.media.length > 0 && (
                <div className="tweet-media">
                  {tweet.media.map((media, mediaIndex) => {
                    if (media.type === 'photo') {
                      return <img key={mediaIndex} src={media.url} alt="图片" />;
                    } else if (media.type === 'video' && media.video_info) {
                      let videoUrl = '';
                      if (media.video_info.variants && media.video_info.variants.length > 0) {
                        const mp4Variants = media.video_info.variants.filter(v => v.content_type === 'video/mp4');
                        if (mp4Variants.length > 0) {
                          mp4Variants.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
                          videoUrl = mp4Variants[0].url;
                        }
                      }
                      
                      if (videoUrl) {
                        return (
                          <video key={mediaIndex} controls>
                            <source src={videoUrl} type="video/mp4" />
                            您的浏览器不支持视频标签
                          </video>
                        );
                      }
                    }
                    return null;
                  })}
                </div>
              )}
              
              <div className="tweet-stats">
                <span>回复: {tweet.reply_count || 0}</span>
                <span>转发: {tweet.retweet_count || 0}</span>
                <span>引用: {tweet.quote_count || 0}</span>
                <span>喜欢: {tweet.favorite_count || 0}</span>
              </div>
              <div className="tweet-date">
                {tweet.created_at ? new Date(tweet.created_at).toLocaleString('zh-CN') : ''}
              </div>
            </div>
          ))}
        </>
      ) : (
        <div className="no-tweets">
          <h2>没有找到推文</h2>
          <p>请检查JSON数据格式或尝试其他解析方法</p>
        </div>
      )}
    </div>
  );
};

export default TwitterUserProfile; 