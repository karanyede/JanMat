import React, { useState } from 'react';
import { ExternalNewsArticle } from '../lib/newsAPI';
import { News } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { 
  X, 
  ExternalLink, 
  Share, 
  Clock, 
  Globe, 
  User, 
  MapPin,
  Heart
} from 'lucide-react';
import { formatRelativeTime } from '../lib/utils';

interface NewsDetailModalProps {
  article: ExternalNewsArticle | News | null;
  isOpen: boolean;
  onClose: () => void;
  isExternal?: boolean;
}

const NewsDetailModal: React.FC<NewsDetailModalProps> = ({ 
  article, 
  isOpen, 
  onClose, 
  isExternal = false 
}) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  // Initialize likes state when article changes
  React.useEffect(() => {
    if (!isExternal && article && user) {
      const newsArticle = article as News;
      setIsLiked(newsArticle.liked_by?.includes(user.id) || false);
      setLikesCount(newsArticle.likes || 0);
    }
  }, [article, user, isExternal]);

  if (!isOpen || !article) return null;

  const handleLike = async (newsItem: News) => {
    if (!user || isExternal) return;

    try {
      const newLikedBy = isLiked 
        ? newsItem.liked_by?.filter(id => id !== user.id) || []
        : [...(newsItem.liked_by || []), user.id];

      const { error } = await supabase
        .from("news")
        .update({
          liked_by: newLikedBy,
          likes: newLikedBy.length
        })
        .eq("id", newsItem.id);

      if (error) throw error;

      // Update local state
      setIsLiked(!isLiked);
      setLikesCount(newLikedBy.length);

    } catch (err) {
      console.error("Error updating like:", err);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: article.title,
      text: isExternal ? (article as ExternalNewsArticle).description : (article as News).content.substring(0, 200) + '...',
      url: isExternal ? (article as ExternalNewsArticle).url : `${window.location.origin}/news/${(article as News).id}`,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Enhanced sharing options
        const shareText = `${shareData.title}\n\n${shareData.text}\n\nRead more: ${shareData.url}`;
        
        // Try to copy to clipboard first
        await navigator.clipboard.writeText(shareText);
        
        // Create share confirmation dialog
        const userChoice = confirm(`Link copied to clipboard!\n\nChoose a platform to share:\n\n1. WhatsApp\n2. Twitter\n3. Facebook\n4. LinkedIn\n5. Telegram\n\nClick OK to open share options, or Cancel to just use the copied link.`);
        
        if (userChoice) {
          // Open a simple share menu (you could make this more sophisticated)
          const platform = prompt("Enter platform number (1-5):", "1");
          
          switch(platform) {
            case "1":
              window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
              break;
            case "2":
              window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.title)}&url=${encodeURIComponent(shareData.url)}`, '_blank');
              break;
            case "3":
              window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}`, '_blank');
              break;
            case "4":
              window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareData.url)}`, '_blank');
              break;
            case "5":
              window.open(`https://t.me/share/url?url=${encodeURIComponent(shareData.url)}&text=${encodeURIComponent(shareData.title)}`, '_blank');
              break;
            default:
              alert("Link is already copied to clipboard!");
          }
        }
      }
    } catch (err) {
      console.error("Error sharing:", err);
      // Final fallback
      try {
        await navigator.clipboard.writeText(`${shareData.title}\n\n${shareData.text}\n\nRead more: ${shareData.url}`);
        alert("Link copied to clipboard!");
      } catch (clipboardErr) {
        console.error("Clipboard access failed:", clipboardErr);
        alert("Unable to share. Please copy the link manually.");
      }
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Type-safe accessors
  const getContent = () => {
    if (isExternal) {
      const extArticle = article as ExternalNewsArticle;
      return extArticle.content || extArticle.description;
    } else {
      return (article as News).content;
    }
  };

  const getImageUrl = () => {
    if (isExternal) {
      return (article as ExternalNewsArticle).image;
    } else {
      return (article as News).image_url;
    }
  };

  const getAuthor = () => {
    if (isExternal) {
      return (article as ExternalNewsArticle).source.name;
    } else {
      return (article as News).author?.full_name || "Government";
    }
  };

  const getPublishedDate = () => {
    if (isExternal) {
      return (article as ExternalNewsArticle).publishedAt;
    } else {
      return (article as News).created_at;
    }
  };

  const getLocation = () => {
    if (isExternal) {
      return (article as ExternalNewsArticle).source.country.toUpperCase();
    } else {
      return (article as News).location;
    }
  };

  const getExternalUrl = () => {
    if (isExternal) {
      return (article as ExternalNewsArticle).url;
    } else {
      return (article as News).external_url;
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {isExternal ? (
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-600">Live News</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-600">JanMat News</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Share article"
            >
              <Share className="w-5 h-5" />
            </button>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Article Image */}
          {getImageUrl() && (
            <div className="w-full h-64 md:h-80 bg-gray-200">
              <img
                src={getImageUrl()!}
                alt={article.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          <div className="p-6">
            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
              {article.title}
            </h1>

            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6 pb-6 border-b border-gray-200">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>{getAuthor()}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{formatRelativeTime(getPublishedDate())}</span>
              </div>
              
              {getLocation() && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{getLocation()}</span>
                </div>
              )}

              {isExternal && (
                <div className="flex items-center gap-1">
                  <Globe className="w-4 h-4" />
                  <span>External Source</span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="prose prose-lg max-w-none">
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {getContent()}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 mt-8 pt-6 border-t border-gray-200">
              {!isExternal && (
                <button 
                  onClick={() => handleLike(article as News)}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg hover:bg-red-200 transition-colors ${
                    isLiked ? "bg-red-500 text-white hover:bg-red-600" : "bg-red-100 text-red-600"
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
                  Like ({likesCount})
                </button>
              )}
              
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-6 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <Share className="w-4 h-4" />
                Share
              </button>

              {getExternalUrl() && (
                <a
                  href={getExternalUrl()!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Original Source
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsDetailModal;
