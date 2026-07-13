import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Fallback datasets if network requests fail or run in offline environments
DEFAULT_VIDEOS = [
    {
        "id": "yt_nippard_ppl",
        "type": "video",
        "category": "strength",
        "title": "The Smartest Way to Structure a Push Pull Legs Routine",
        "author": "Jeff Nippard",
        "duration": "14:22",
        "thumbnail": "https://img.youtube.com/vi/kP_2S3s3b0Q/hqdefault.jpg",
        "url": "https://www.youtube.com/watch?v=kP_2S3s3b0Q",
        "summary": "Science-based guide on maximizing frequency and recovery using the Push Pull Legs split.",
        "citations": [
            {"name": "Training Frequency Meta-Analysis (Schoenfeld et al., 2016)", "url": "https://pubmed.ncbi.nlm.nih.gov/27102424/"}
        ]
    },
    {
        "id": "yt_rp_hypertrophy",
        "type": "video",
        "category": "strength",
        "title": "How Many Reps Should You Do for Muscle Growth?",
        "author": "Renaissance Periodization",
        "duration": "12:45",
        "thumbnail": "https://img.youtube.com/vi/e1P9zS7QeD0/hqdefault.jpg",
        "url": "https://www.youtube.com/watch?v=e1P9zS7QeD0",
        "summary": "Dr. Mike Israetel explains why the 5-30 rep range is effective for hypertrophy as long as sets are close to failure.",
        "citations": [
            {"name": "Reps to Failure study (Mitchell et al., 2012)", "url": "https://pubmed.ncbi.nlm.nih.gov/22510492/"}
        ]
    },
    {
        "id": "yt_ethier_diet",
        "type": "video",
        "category": "nutrition",
        "title": "The Best Diet Strategy to Lose Fat and Retain Muscle",
        "author": "Jeremy Ethier",
        "duration": "10:15",
        "thumbnail": "https://img.youtube.com/vi/s2R_t2t4a9A/hqdefault.jpg",
        "url": "https://www.youtube.com/watch?v=s2R_t2t4a9A",
        "summary": "Step-by-step macronutrient setup and calorie deficit strategies based on sports nutrition research.",
        "citations": [
            {"name": "Protein intake during caloric deficit (Helms et al., 2014)", "url": "https://pubmed.ncbi.nlm.nih.gov/24092765/"}
        ]
    }
]

DEFAULT_ARTICLES = [
    {
        "id": "art_examine_fasting",
        "type": "article",
        "category": "nutrition",
        "title": "Does Intermittent Fasting Slow Down Your Metabolism?",
        "author": "Examine.com",
        "read_time": "5 min read",
        "url": "https://examine.com/diet/intermittent-fasting/",
        "summary": "A high-level breakdown of clinical trials comparing intermittent fasting to daily caloric restriction. Spoilers: it doesn't wreck your metabolic rate.",
        "citations": [
            {"name": "Caloric Restriction vs Intermittent Fasting (Seimon et al., 2015)", "url": "https://pubmed.ncbi.nlm.nih.gov/26384657/"}
        ]
    },
    {
        "id": "art_sbs_recovery",
        "type": "article",
        "category": "recovery",
        "title": "Active Recovery vs Passive Recovery: What Science Says",
        "author": "Stronger by Science",
        "read_time": "6 min read",
        "url": "https://www.strongerbyscience.com/active-recovery/",
        "summary": "How light exercise (like walking or mobility work) compares to complete rest in restoring force output and clearing lactate.",
        "citations": [
            {"name": "Lactate Clearance & Active Recovery (Dupuy et al., 2018)", "url": "https://pubmed.ncbi.nlm.nih.gov/29713333/"}
        ]
    },
    {
        "id": "art_ms_carb_cycling",
        "type": "article",
        "category": "nutrition",
        "title": "Beginner's Guide to Carb Cycling for Fat Loss",
        "author": "Muscle & Strength",
        "read_time": "4 min read",
        "url": "https://www.muscleandstrength.com/articles/carb-cycling-guide",
        "summary": "How to structure high-carb, low-carb, and moderate-carb days around your training schedule to optimize thyroid output and performance.",
        "citations": [
            {"name": "Glycogen depletion and performance (Hearris et al., 2018)", "url": "https://pubmed.ncbi.nlm.nih.gov/29483751/"}
        ]
    }
]

DEFAULT_TIPS = [
    {
        "id": 1,
        "text": "Even a 2% drop in total body hydration can lead to a 10% decrease in peak muscular strength. Drink 500ml of water 30 minutes before your workouts!",
        "citation": "Journal of Strength & Conditioning Research, 2020",
        "citation_url": "https://pubmed.ncbi.nlm.nih.gov/3290192/"
    },
    {
        "id": 2,
        "text": "Consuming protein within 2 hours post-workout maximizes muscle protein synthesis, but total daily protein intake remains the absolute driver for growth.",
        "citation": "Journal of the International Society of Sports Nutrition, 2013",
        "citation_url": "https://pubmed.ncbi.nlm.nih.gov/23374887/"
    },
    {
        "id": 3,
        "text": "Active recovery (like a light 20-minute walk) reduces muscle soreness (DOMS) significantly faster than complete passive bed rest.",
        "citation": "Frontiers in Physiology, 2018",
        "citation_url": "https://pubmed.ncbi.nlm.nih.gov/29713333/"
    }
]

import ssl
ssl_context = ssl._create_unverified_context()

YOUTUBE_FEEDS = {
    "Jeff Nippard": "UC68TLK0mAEzUyHx5x5kg-Sg",
    "Renaissance Periodization": "UCfQgsKhHjSyRLOp9nfgqYGQ",
    "Jeremy Ethier": "UCSRw1t5YdM4qH8-j1Yx8e5A"
}

RSS_FEEDS = {
    "Stronger by Science": "https://www.strongerbyscience.com/feed/",
    "Barbell Medicine": "https://www.barbellmedicine.com/feed/"
}

class FeedService:
    def __init__(self):
        self.cached_feed = None
        self.last_fetched = None

    def fetch_youtube_rss(self, author_name, channel_id):
        url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            with urllib.request.urlopen(req, context=ssl_context, timeout=5) as response:
                xml_data = response.read()
            
            root = ET.fromstring(xml_data)
            
            # YouTube XML uses Atom Namespace
            ns = {'atom': 'http://www.w3.org/2005/Atom', 'yt': 'http://www.youtube.com/xml/schemas/2015'}
            
            videos = []
            # We just take the latest 2 videos per author to avoid clutter
            for entry in root.findall('atom:entry', ns)[:2]:
                video_id = entry.find('yt:videoId', ns).text
                title = entry.find('atom:title', ns).text
                
                # Settle categories dynamically
                category = "nutrition" if "diet" in title.lower() or "eating" in title.lower() or "protein" in title.lower() else "strength"
                
                videos.append({
                    "id": f"yt_{video_id}",
                    "type": "video",
                    "category": category,
                    "title": title,
                    "author": author_name,
                    "duration": "12:00",  # Placeholder default duration
                    "thumbnail": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
                    "url": f"https://www.youtube.com/watch?v={video_id}",
                    "summary": f"Watch the latest research breakdown from {author_name}.",
                    "citations": [
                        {"name": "YouTube Original Channel", "url": f"https://www.youtube.com/channel/{channel_id}"}
                    ]
                })
            return videos
        except Exception as e:
            logger.warning(f"Failed to fetch YouTube feed for {author_name}: {e}")
            return []

    def fetch_article_rss(self, author_name, url):
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            with urllib.request.urlopen(req, context=ssl_context, timeout=5) as response:
                xml_data = response.read()
            
            root = ET.fromstring(xml_data)
            
            items = []
            videos = []
            
            # Read all items to scan for embedded videos
            for item in root.findall('.//item'):
                title = item.find('title').text
                link = item.find('link').text
                description = item.find('description')
                content_encoded = item.find('{http://purl.org/rss/1.0/modules/content/}encoded')
                
                desc_text = description.text if description is not None else ""
                
                # Check for embedded YouTube links in description or full content
                text_to_scan = desc_text
                if content_encoded is not None and content_encoded.text:
                    text_to_scan += content_encoded.text
                
                import re
                youtube_ids = re.findall(
                    r'(?:youtube\.com/(?:embed/|v/|watch\?v=|watch\?.+&v=)|youtu\.be/)([a-zA-Z0-9_-]{11})',
                    text_to_scan
                )
                
                category = "nutrition" if "nutrition" in title.lower() or "diet" in title.lower() or "carb" in title.lower() else "strength"
                
                # Add extracted video dynamically
                if youtube_ids:
                    # Avoid duplicate video IDs
                    for v_id in set(youtube_ids):
                        videos.append({
                            "id": f"yt_{v_id}",
                            "type": "video",
                            "category": category,
                            "title": f"Video Guide: {title}",
                            "author": author_name,
                            "duration": "8:30",  # Approximated
                            "thumbnail": f"https://img.youtube.com/vi/{v_id}/hqdefault.jpg",
                            "url": f"https://www.youtube.com/watch?v={v_id}",
                            "summary": f"Watch the video guide accompanying the research update: '{title}'.",
                            "citations": [
                                {"name": f"{author_name} - Associated Article", "url": link}
                            ]
                        })
                
                # Strip HTML tags from description if present
                if desc_text:
                    desc_text = re.sub('<[^<]+?>', '', desc_text)[:160].strip() + "..."
                
                # Limit return list to 2 articles per source to keep UI clean
                if len(items) < 2:
                    items.append({
                        "id": f"art_{hash(link)}",
                        "type": "article",
                        "category": category,
                        "title": title,
                        "author": author_name,
                        "read_time": "5 min read",
                        "url": link,
                        "summary": desc_text or f"Read the latest science-based articles from {author_name}.",
                        "citations": [
                            {"name": f"{author_name} - Original Publication", "url": link}
                        ]
                    })
            return items, videos
        except Exception as e:
            logger.warning(f"Failed to fetch RSS feed for {author_name}: {e}")
            return [], []

    def get_feed(self):
        # Cache for 6 hours
        now = datetime.now(timezone.utc)
        if self.cached_feed and self.last_fetched:
            age = (now - self.last_fetched).total_seconds()
            if age < 21600:  # 6 hours
                return self.cached_feed

        logger.info("Fetching fresh Resource and Learning Hub feeds...")
        
        videos = []
        for author, channel_id in YOUTUBE_FEEDS.items():
            parsed_vids = self.fetch_youtube_rss(author, channel_id)
            if parsed_vids:
                videos.extend(parsed_vids)
            
        articles = []
        for author, url in RSS_FEEDS.items():
            parsed_arts, parsed_vids = self.fetch_article_rss(author, url)
            articles.extend(parsed_arts)
            videos.extend(parsed_vids)
            
        # Fallback handling for video outages
        if not videos:
            logger.info("Using default fallback video feeds")
            videos = DEFAULT_VIDEOS
        if not articles:
            logger.info("Using default fallback article feeds")
            articles = DEFAULT_ARTICLES

        # Combine, sort, and select rotating daily tip
        day_of_year = datetime.now().timetuple().tm_yday
        daily_tip = DEFAULT_TIPS[day_of_year % len(DEFAULT_TIPS)]

        self.cached_feed = {
            "tip": daily_tip,
            "videos": videos,
            "articles": articles
        }
        self.last_fetched = now
        return self.cached_feed

feed_service = FeedService()
