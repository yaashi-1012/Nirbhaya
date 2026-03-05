export function formatTimeAgo(dateInput) {
    if (!dateInput) return '';
    const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
    const seconds = Math.floor((new Date() - date) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) {
        const days = Math.floor(interval);
        return days === 1 ? "Yesterday" : days + " days ago";
    }
    interval = seconds / 3600;
    if (interval > 1) {
        const hrs = Math.floor(interval);
        return hrs === 1 ? "1 hour ago" : hrs + " hours ago";
    }
    interval = seconds / 60;
    if (interval > 1) {
        const mins = Math.floor(interval);
        return mins === 1 ? "1 minute ago" : mins + " minutes ago";
    }
    return "Just now";
}

